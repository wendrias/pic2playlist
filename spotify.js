/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

//for image upload
const fileupload = require('express-fileupload')
const path = require('path')
const fs = require("fs");

let imageData = require('./index')

var client_id = '3c1b5bc480524567b18bdf73a9aef2c9'; // Your client id
var client_secret = '0160139153364df9810fb36ce5d0ab70'; // Your secret
var redirect_uri = 'https://pic2playlist.herokuapp.com/callback'; // Your redirect uri

var SpotifyWebApi = require('spotify-web-api-node');
const { resourceLimits } = require('worker_threads');
const { initParams } = require('request');

var spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
});



/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());


//for image upload
app.use(fileupload())
let imgPath;

//route for image upload
app.post('/saveImage', (req, res) => {
    const fileName = req.files.myFile.name
    const image = req.files.myFile
    imgPath = __dirname + '/img/' + fileName
    console.log("the image path" + imgPath)
    setPath(imgPath)

    image.mv(imgPath, (error) => {
        if (error) {
            console.error(error)
            res.writeHead(500, {
                'Content-Type': 'application/json'
            })
            res.end(JSON.stringify({ status: 'error', message: error }))
            return
        }

        res.writeHead(200, {
            'Content-Type': 'application/json'
        })
        res.end(JSON.stringify({ status: 'success', path: '/img/' + fileName }))
    })
})

//for image upload path
function setPath(newPath) {
    imgPath = newPath;
}

//to delete image from server after finished
function deleteImg(imgPath) {
    fs.unlink(imgPath, function(err) {
        if (err) {
            console.error(err);
        } else {
            console.log("File removed:", imgPath);
        }
    });
}


app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email playlist-modify-public user-library-read user-library-modify ugc-image-upload';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body.id);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token,
                        user_id: body.id
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

app.post('/playlist', (req, res) => {
    spotifyApi.createPlaylist('My playlist', { 'description': 'My description', 'public': true })
        .then(function(data) {
            console.log('Created playlist!');
        }, function(err) {
            console.log('Something went wrong!', err);
        });
});

//search route
app.get('/search', (req, res) => {

    // let userId = req.query.user_id;
    let access_token = req.query.access_token;

    // // test(userId, access_token);
    // res.json({ test: "working" })
    const image = req.files.myFile
    imgPath = __dirname + '/images/' + fileName
    setPath(imgPath)

    console.log("accessing image path: " + imgPath)

    imageData.getImageData(imgPath).then((result) => {
        let searchTerms = result;
        let listTitle = result.title;
        let results;
        let track;
        let trackList = [];
        let counter;
        spotifyApi.setAccessToken(access_token);

        searchTerms.terms.forEach((term, i) => {
            console.log("on the " + i + "th term: " + searchTerms.terms[i].value)
                // check for exact search term match & not autocompleted
            spotifyApi.searchTracks("track:\"" + term.value + "\"", { limit: 3 }).then((data) => {
                results = data.body.tracks.items;
                if (results.length > 3) {
                    let randIndex = randNum(0, 2);
                } else {
                    let randIndex = randNum(0, results.length - 1)
                }

                if (results.length > 0 && searchTerms.terms[i].value.split(" ") == 1) {
                    if (results[0].name.toLowerCase().split(" ").includes(searchTerms.terms[i].value.toLowerCase())) { //possible imporvement: random index instead of the first one
                        track = { name: results[0].name, id: results[0].id };
                    } else if (results.length > 1 && results[1].name.toLowerCase().split(" ").includes(searchTerms.terms[i].value.toLowerCase())) {
                        track = { name: results[1].name, id: results[1].id };
                    } else if (results.length > 2 && results[2].name.toLowerCase().split(" ").includes(searchTerms.terms[i].value.toLowerCase())) {
                        track = { name: results[2].name, id: results[2].id };
                    } else {
                        track = { name: results[0].name, id: results[0].id };
                    }
                } else {
                    track = { name: results[0].name, id: results[0].id };
                }

                // console.log("track object:" + JSON.stringify(track))
                addToTrackList(track);

                // after going thru all the results
                if (i == searchTerms.terms.length - 1) {
                    setTimeout(() => {
                        console.log("Tracklist is!!!!:" + trackList)
                        deleteImg(imgPath);
                        res.json({ tracks: trackList, title: listTitle });
                    }, 5000)
                }
            })

        })

        function addToTrackList(track) {
            // console.log("adding track:" + JSON.stringify(track));
            trackList.push("spotify:track:" + track.id)
        }


    });


    // setSearchTerms();
    // searchTerms = setSearchTerms().then((data) => {
    //     console.log("searchTerms: " + data)
    // });
    // console.log("search terms:" + (searchTerms))


    // let results;
    // let track;
    // let listTitle = "Cat at Eiffel Tower";
    // let trackList = [];


    // spotifyApi.setAccessToken(acessToken);

    // imageData.getImageData().terms.forEach((term) => {
    //     // check for exact search term match & not autocompleted
    //     spotifyApi.searchTracks("track:" + term.value, { limit: 3 }).then((data) => {
    //         results = data.body.tracks.items;
    //         if (results.length > 0) {
    //             if (results[0].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) { //change searchTerms thing according to loop(remove index)
    //                 track = { name: results[0].name, id: results[0].id };
    //             } else if (results.length > 1 && results[1].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) {
    //                 track = { name: results[1].name, id: results[1].id };
    //             } else if (results.length > 2 && results[2].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) {
    //                 track = { name: results[2].name, id: results[2].id };
    //             } else {
    //                 track = { name: results[0].name, id: results[0].id };
    //             }
    //         }

    //         console.log("track object:" + JSON.stringify(track))
    //         addToTrackList(track);
    //     })
    // })

    // console.log("track list!!!!" + JSON.stringify(trackList))

    // res.json({ tracks: trackList, title: listTitle });




    // let trackObj;
    // let trackList = [];
    // let track;
    // let results;

    // let searchTerms = imageData.getImageData().terms;
    // console.log("serchterms:" + JSON.stringify(searchTerms))
    //     // addJointTrackQuery(searchTerms);


    // // Go through searchTerms and search each term --change: make promise

    // spotifyApi.searchTracks("track:" + searchTerms[0].value, { limit: 1 }).then((data) => {
    //     console.log(JSON.stringify(data));
    // })


    // searchTerms.forEach((term) => {
    //     // Use the access token to retrieve information
    //     console.log("term.value" + term.value)

    //     setTimeout(function() { //change: add to then part of promise
    //         spotifyApi.searchTracks("track:" + term.value + " NOT with " + " NOT ft. " + " NOT featuring" + " NOT feat.").then((data) => { //change?
    //             console.log(JSON.stringify(data))
    //             results = data.body.tracks.items;
    //             // console.log("res length" + results.length)
    //             //pick a result at random index
    //             track = results[randNum(0, 1)]
    //             setTimeout(function() {
    //                 // console.log("search term:" + term.value + "    result" + JSON.stringify(results[0]['name']));
    //             }, 3000);
    //         })

    //         // console.log("\n track name:" + track)
    //         // trackObj = { title: track.value.name, id: track.value.id, uri: track.value.uri };
    //         // console.log(trackObj)
    //         // addToTrackList(trackObj)
    //     }, 3000)

    //     // setTimeout(function() {
    //     //     console.log("\n TRACK LIST: " + trackList);
    //     // }, 10000)
    // })



    // function addToTrackList(track) {
    //     // console.log("adding track:" + JSON.stringify(track));
    //     trackList.push(JSON.stringify(track))
    // }

    // setTimeout(function() { //change: add to then part of promise
    //     // console.log(trackList)
    //     res.send({ tracks: trackList });
    // }, 3000); //wait 3 seconds!


    // console.log(JSON.stringify(req.query.image));

    //using the google vision api function to get search terms, passing in user's uploaded image
    // let searchTerms = imageData.getImageData(req.query.image).terms;
    // let results;
    // let track;
    // console.log("Passed in image url:" + req.query.image)

    // console.log(JSON.stringify(searchTerms))


});


function randNum(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}


function test() {

    return {
        "body": {
            "tracks": {
                "href": "https://api.spotify.com/v1/search?query=track%3ABrown&type=track&offset=0&limit=1",
                "items": [{
                        "album": {
                            "album_type": "album",
                            "artists": [{
                                "external_urls": {
                                    "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                                },
                                "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                                "id": "44NX2ffIYHr6D4n7RaZF7A",
                                "name": "Van Morrison",
                                "type": "artist",
                                "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                            }],
                            "available_markets": ["AD"],
                            "external_urls": {
                                "spotify": "https://open.spotify.com/album/7dsWupQRlFuhG8FGiQAUjC"
                            },
                            "href": "https://api.spotify.com/v1/albums/7dsWupQRlFuhG8FGiQAUjC",
                            "id": "7dsWupQRlFuhG8FGiQAUjC",
                            "images": [{
                                    "height": 640,
                                    "url": "https://i.scdn.co/image/ab67616d0000b2733f29a976eea00141514ab936",
                                    "width": 640
                                },
                                {
                                    "height": 300,
                                    "url": "https://i.scdn.co/image/ab67616d00001e023f29a976eea00141514ab936",
                                    "width": 300
                                },
                                {
                                    "height": 64,
                                    "url": "https://i.scdn.co/image/ab67616d000048513f29a976eea00141514ab936",
                                    "width": 64
                                }
                            ],
                            "name": "Blowin' Your Mind!",
                            "release_date": "1967-09",
                            "release_date_precision": "month",
                            "total_tracks": 8,
                            "type": "album",
                            "uri": "spotify:album:7dsWupQRlFuhG8FGiQAUjC"
                        },
                        "artists": [{
                            "external_urls": {
                                "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                            },
                            "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                            "id": "44NX2ffIYHr6D4n7RaZF7A",
                            "name": "Van Morrison",
                            "type": "artist",
                            "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                        }],
                        "available_markets": ["AD"],
                        "disc_number": 1,
                        "duration_ms": 183306,
                        "explicit": false,
                        "external_ids": {
                            "isrc": "USSM16700357"
                        },
                        "external_urls": {
                            "spotify": "https://open.spotify.com/track/3yrSvpt2l1xhsV9Em88Pul"
                        },
                        "href": "https://api.spotify.com/v1/tracks/3yrSvpt2l1xhsV9Em88Pul",
                        "id": "3yrSvpt2l1xhsV9Em88Pul",
                        "is_local": false,
                        "name": "BrownStone",
                        "popularity": 80,
                        "preview_url": "https://p.scdn.co/mp3-preview/0d41c6170b692509da64b9f5bfc36389b55540bd?cid=3c1b5bc480524567b18bdf73a9aef2c9",
                        "track_number": 1,
                        "type": "track",
                        "uri": "spotify:track:3yrSvpt2l1xhsV9Em88Pul"
                    },
                    {
                        "album": {
                            "album_type": "album",
                            "artists": [{
                                "external_urls": {
                                    "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                                },
                                "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                                "id": "44NX2ffIYHr6D4n7RaZF7A",
                                "name": "Van Morrison",
                                "type": "artist",
                                "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                            }],
                            "available_markets": ["AD"],
                            "external_urls": {
                                "spotify": "https://open.spotify.com/album/7dsWupQRlFuhG8FGiQAUjC"
                            },
                            "href": "https://api.spotify.com/v1/albums/7dsWupQRlFuhG8FGiQAUjC",
                            "id": "7dsWupQRlFuhG8FGiQAUjC",
                            "images": [{
                                    "height": 640,
                                    "url": "https://i.scdn.co/image/ab67616d0000b2733f29a976eea00141514ab936",
                                    "width": 640
                                },
                                {
                                    "height": 300,
                                    "url": "https://i.scdn.co/image/ab67616d00001e023f29a976eea00141514ab936",
                                    "width": 300
                                },
                                {
                                    "height": 64,
                                    "url": "https://i.scdn.co/image/ab67616d000048513f29a976eea00141514ab936",
                                    "width": 64
                                }
                            ],
                            "name": "Blowin' Your Mind!",
                            "release_date": "1967-09",
                            "release_date_precision": "month",
                            "total_tracks": 8,
                            "type": "album",
                            "uri": "spotify:album:7dsWupQRlFuhG8FGiQAUjC"
                        },
                        "artists": [{
                            "external_urls": {
                                "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                            },
                            "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                            "id": "44NX2ffIYHr6D4n7RaZF7A",
                            "name": "Van Morrison",
                            "type": "artist",
                            "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                        }],
                        "available_markets": ["AD"],
                        "disc_number": 1,
                        "duration_ms": 183306,
                        "explicit": false,
                        "external_ids": {
                            "isrc": "USSM16700357"
                        },
                        "external_urls": {
                            "spotify": "https://open.spotify.com/track/3yrSvpt2l1xhsV9Em88Pul"
                        },
                        "href": "https://api.spotify.com/v1/tracks/3yrSvpt2l1xhsV9Em88Pul",
                        "id": "3yrSvpt2l1xhsV9Em88Pul",
                        "is_local": false,
                        "name": "Brown Eyed Girl",
                        "popularity": 80,
                        "preview_url": "https://p.scdn.co/mp3-preview/0d41c6170b692509da64b9f5bfc36389b55540bd?cid=3c1b5bc480524567b18bdf73a9aef2c9",
                        "track_number": 1,
                        "type": "track",
                        "uri": "spotify:track:3yrSvpt2l1xhsV9Em88Pul"
                    },
                    {
                        "album": {
                            "album_type": "album",
                            "artists": [{
                                "external_urls": {
                                    "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                                },
                                "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                                "id": "44NX2ffIYHr6D4n7RaZF7A",
                                "name": "Van Morrison",
                                "type": "artist",
                                "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                            }],
                            "available_markets": ["AD"],
                            "external_urls": {
                                "spotify": "https://open.spotify.com/album/7dsWupQRlFuhG8FGiQAUjC"
                            },
                            "href": "https://api.spotify.com/v1/albums/7dsWupQRlFuhG8FGiQAUjC",
                            "id": "7dsWupQRlFuhG8FGiQAUjC",
                            "images": [{
                                    "height": 640,
                                    "url": "https://i.scdn.co/image/ab67616d0000b2733f29a976eea00141514ab936",
                                    "width": 640
                                },
                                {
                                    "height": 300,
                                    "url": "https://i.scdn.co/image/ab67616d00001e023f29a976eea00141514ab936",
                                    "width": 300
                                },
                                {
                                    "height": 64,
                                    "url": "https://i.scdn.co/image/ab67616d000048513f29a976eea00141514ab936",
                                    "width": 64
                                }
                            ],
                            "name": "Blowin' Your Mind!",
                            "release_date": "1967-09",
                            "release_date_precision": "month",
                            "total_tracks": 8,
                            "type": "album",
                            "uri": "spotify:album:7dsWupQRlFuhG8FGiQAUjC"
                        },
                        "artists": [{
                            "external_urls": {
                                "spotify": "https://open.spotify.com/artist/44NX2ffIYHr6D4n7RaZF7A"
                            },
                            "href": "https://api.spotify.com/v1/artists/44NX2ffIYHr6D4n7RaZF7A",
                            "id": "44NX2ffIYHr6D4n7RaZF7A",
                            "name": "Van Morrison",
                            "type": "artist",
                            "uri": "spotify:artist:44NX2ffIYHr6D4n7RaZF7A"
                        }],
                        "available_markets": ["AD"],
                        "disc_number": 1,
                        "duration_ms": 183306,
                        "explicit": false,
                        "external_ids": {
                            "isrc": "USSM16700357"
                        },
                        "external_urls": {
                            "spotify": "https://open.spotify.com/track/3yrSvpt2l1xhsV9Em88Pul"
                        },
                        "href": "https://api.spotify.com/v1/tracks/3yrSvpt2l1xhsV9Em88Pul",
                        "id": "3yrSvpt2l1xhsV9Em88Pul",
                        "is_local": false,
                        "name": "Brown Eyed Girl",
                        "popularity": 80,
                        "preview_url": "https://p.scdn.co/mp3-preview/0d41c6170b692509da64b9f5bfc36389b55540bd?cid=3c1b5bc480524567b18bdf73a9aef2c9",
                        "track_number": 1,
                        "type": "track",
                        "uri": "spotify:track:3yrSvpt2l1xhsV9Em88Pul"
                    }
                ],
                "limit": 1,
                "next": "https://api.spotify.com/v1/search?query=track%3ABrown&type=track&offset=1&limit=1",
                "offset": 0,
                "previous": null,
                "total": 10000
            }
        },
        "headers": {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=7200",
            "x-robots-tag": "noindex, nofollow",
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "Accept, App-Platform, Authorization, Content-Type, Origin, Retry-After, Spotify-App-Version, X-Cloud-Trace-Context, client-token, content-access-token",
            "access-control-allow-methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
            "access-control-allow-credentials": "true",
            "access-control-max-age": "604800",
            "content-encoding": "gzip",
            "strict-transport-security": "max-age=31536000",
            "x-content-type-options": "nosniff",
            "date": "Tue, 23 Aug 2022 16:35:38 GMT",
            "server": "envoy",
            "via": "HTTP/2 edgeproxy, 1.1 google",
            "alt-svc": "h3=\":443\"; ma=2592000,h3-29=\":443\"; ma=2592000",
            "connection": "close",
            "transfer-encoding": "chunked"
        },
        "statusCode": 200
    }
    // let searchTerms = imageData.getImageData().terms;

    // let results = data.body.tracks.items;
    // let totalResults = results.length;
    // let track;
    // let title = "Cat at Eiffel Tower";
    // let trackList = [];


    // function addToTrackList(track) {
    //     // console.log("adding track:" + JSON.stringify(track));
    //     trackList.push(track.id)
    // }

    // // check for exact search term match & not autocompleted
    // if (results[0].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) { //change searchTerms thing according to loop(remove index)
    //     track = { name: results[0].name, id: results[0].id };
    // } else if (results.length > 1 && results[1].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) {
    //     track = { name: results[1].name, id: results[1].id };
    // } else if (results.length > 2 && results[2].name.toLowerCase().split(" ").includes(searchTerms[0].value.toLowerCase())) {
    //     track = { name: results[2].name, id: results[2].id };
    // } else {
    //     track = { name: results[0].name, id: results[0].id };
    // }

    // console.log("track object:" + JSON.stringify(track))
    // addToTrackList(track);

    // console.log("track list!!!!" + JSON.stringify(trackList))

    // res.json({ track: trackList });
}

//adds one more query to the search terms list
function addJointTrackQuery(terms) {
    let data = imageData.getImageData().terms;

    //get all color terms
    let colors = data.filter(term => {
        return term.type === 'color'
    })

    //get all object terms
    let objects = data.filter(term => {
        return term.type === 'object' || term.type === 'label' //label in case no obj
    })

    terms.push(colors[0].value + " " + objects[0].value);
    return terms;
}



app.listen(process.env.PORT || 80);