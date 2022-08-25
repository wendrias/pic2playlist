const express = require('express');
const app = express();
const vision = require('@google-cloud/vision');
const colorTool = require('./resources/color-name-tool')

async function getImageData(imgFile) {
    let searchTerms = [];
    let title = "";
    // // Imports the Google Cloud client library
    const client = new vision.ImageAnnotatorClient();
    // const fileName = './img/trump.jpg';


    //COLORS
    const [colorResult] = await client.imageProperties(imgFile);
    const colors = colorResult.imagePropertiesAnnotation.dominantColors.colors;
    // // colors.forEach((c) => console.log(rgbToHex(c.color.red, c.color.green, c.color.blue)));
    // console.log(colors);

    //OBJECTS
    const [objectResult] = await client.objectLocalization(imgFile);
    const objects = objectResult.localizedObjectAnnotations;
    // objects.forEach(object => {
    //      console.log(`Name: ${object.name}`);
    // // console.log(`Confidence: ${object.score}`);
    // });

    //LABELS
    const [labelResult] = await client.labelDetection(imgFile);
    const labels = labelResult.labelAnnotations;
    // console.log(labels);
    // labels.forEach(label => console.log(label.description));

    //LANDMARK ?? 
    const [landmarkResult] = await client.landmarkDetection(imgFile);
    const landmarks = landmarkResult.landmarkAnnotations;
    // console.log("landmarks:" + JSON.stringify(landmarks)) //delete
    // landmarks.forEach((landmark) => {
    //     landmark = "" + landmark.description.split(" ")[0] + " " + landmark.description.split(" ")[1];
    //     searchTerms.push({ type: "landmark", value: landmark });
    // })

    //FACE
    const [faceResult] = await client.faceDetection(imgFile);
    const faces = faceResult.faceAnnotations;
    // console.log('Faces:' + faces);
    // console.log(JSON.parse(JSON.stringify(faces)));

    addLabels(searchTerms, labels);
    addColors(searchTerms, colors);
    addFaces(searchTerms, faces);
    addLandmarks(searchTerms, landmarks);
    addObjects(searchTerms, objects);
    title = generateTitle(colors, labels, landmarks);
    searchTerms.forEach(t => console.log(t.value));


    result = { title: title, terms: searchTerms }
    console.log("google api result: " + result)
    return result;
}

const rgbToHex = (r, g, b) =>
    "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

// check if search term already in array
const isDuplicate = (searchTerms, word) => {
    let result = false;
    searchTerms.forEach((term) => {
        if (term.value == word) {
            result = true;
        }
    })

    return result;
}


const addColors = (searchTerms, colors) => {
    let colorInfo = [];
    let counter = 0;
    let hex;
    let generalColorName;
    let exactColorName;
    colors.forEach(
        (c) => {
            if (counter < 4) {
                hex = rgbToHex(c.color.red, c.color.green, c.color.blue);
                generalColorName = colorTool.colorName.name(hex)[3];
                exactColorName = colorTool.colorName.name(hex)[1];
                //putting color names into colorinfo
                colorInfo.push([hex, exactColorName, generalColorName]);
                if (!(isDuplicate(searchTerms, generalColorName))) { //so only top 2 colors and not incl already
                    searchTerms.push({ type: "color", value: generalColorName });
                    counter++;
                }
            }
        }
    )
}

const addObjects = (searchTerms, objects) => {
    let counter = 0;
    objects.forEach(object => {
        if (counter < 2) {
            if (!(isDuplicate(searchTerms, object.name)) && !(isDuplicate(searchTerms, object.name + 's'))) {
                // obj not incl -- adding
                searchTerms.push({ type: "object", value: object.name });
                //  searchTerms.push(object.name)
                counter++;
            }
            //  else if ((isDuplicate(searchTerms, object.name)) && !(isDuplicate(searchTerms, object.name + 's'))) {
            //     //obj already incl, making plural
            //     if (object.name.endsWith('s')) {
            //         searchTerms.push({ type: "object", value: object.name + 'es' });
            //     } else {
            //         searchTerms.push({ type: "object", value: object.name + 's' });
            //     }
            // }
        }
    });
}

const addLandmarks = (searchTerms, landmarks) => {
    landmarks.forEach((landmark) => {
        landmark = "" + landmark.description.split(" ")[0] + " " + landmark.description.split(" ")[1];
        searchTerms.push({ type: "landmark", value: landmark });
    })
}


const addFaces = (searchTerms, faces) => {
    faces.forEach((face) => {
        if (face.joyLikelihood == "LIKELY" || face.joyLikelihood == "VERY_LIKELY") {
            if (!isDuplicate(searchTerms, "Happy")) {
                console.log("Happy duplicate: " + isDuplicate(searchTerms, "Happy"));
                searchTerms.push({ type: "mood", value: "Happy" });
            }
        }
        if (face.angerLikelihood == "LIKELY" || face.angerLikelihood == "VERY_LIKELY") {
            if (!isDuplicate(searchTerms, "Angry")) {
                searchTerms.push({ type: "mood", value: "Angry" });
            }
        }
        if (face.SorrowLikelihood == "LIKELY" || face.SorrowLikelihood == "VERY_LIKELY") {
            if (!isDuplicate(searchTerms, "Sad")) {
                searchTerms.push({ type: "mood", value: "Sad" });
            }
        }
    });
}
const addLabels = (searchTerms, labels) => {
    labels.every((label) => {
        if (labels.indexOf(label) < 3) { //add top three labels if not duplicates
            if (!(isDuplicate(searchTerms, label.description))) {
                searchTerms.push({ type: "label", value: label.description });
                return true;
            }
            return true;
        } else {
            return false;
        }
    });
}

const generateTitle = (colors, labels, landmarks) => {
    let hex = rgbToHex(colors[0].color.red, colors[0].color.green, colors[0].color.blue);
    let title;

    if (landmarks[0]) {
        let landmark = "" + landmarks[0].description.split(" ")[0] + " " + landmarks[0].description.split(" ")[1];
        console.log("there's a landmark!")
        title = labels[0].description + " at " + landmark;
    } else {
        title = colorTool.colorName.name(hex)[3] + " " + labels[0].description;
    }
    console.log(title)
    return title;
}

// getImageData(); //change





const test = () => {
        // test labels
        const labels = [{
                locations: [],
                properties: [],
                mid: '/m/01yrx',
                locale: '',
                description: 'Cat',
                score: 0.9524871110916138,
                confidence: 0,
                topicality: 0.9524871110916138,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/0307l',
                locale: '',
                description: 'Felidae',
                score: 0.899928629398346,
                confidence: 0,
                topicality: 0.899928629398346,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/07k6w8',
                locale: '',
                description: 'Small to medium-sized cats',
                score: 0.8779815435409546,
                confidence: 0,
                topicality: 0.8779815435409546,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/01lrl',
                locale: '',
                description: 'Carnivore',
                score: 0.8764902949333191,
                confidence: 0,
                topicality: 0.8764902949333191,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/08xgn7',
                locale: '',
                description: 'Comfort',
                score: 0.8683686256408691,
                confidence: 0,
                topicality: 0.8683686256408691,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/01l7qd',
                locale: '',
                description: 'Whiskers',
                score: 0.8561066389083862,
                confidence: 0,
                topicality: 0.8561066389083862,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/036k5h',
                locale: '',
                description: 'Grey',
                score: 0.840984046459198,
                confidence: 0,
                topicality: 0.840984046459198,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/0276krm',
                locale: '',
                description: 'Fawn',
                score: 0.8155730962753296,
                confidence: 0,
                topicality: 0.8155730962753296,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/05mqq3',
                locale: '',
                description: 'Snout',
                score: 0.7642112374305725,
                confidence: 0,
                topicality: 0.7642112374305725,
                boundingPoly: null
            },
            {
                locations: [],
                properties: [],
                mid: '/m/0fbf1m',
                locale: '',
                description: 'Terrestrial animal',
                score: 0.7463634014129639,
                confidence: 0,
                topicality: 0.7463634014129639,
                boundingPoly: null
            }
        ]

        // test colors
        let colors = [{
                color: { red: 67, green: 49, blue: 33, alpha: null },
                score: 0.1396964192390442,
                pixelFraction: 0.06700000166893005
            },
            {
                color: { red: 163, green: 153, blue: 156, alpha: null },
                score: 0.05479979142546654,
                pixelFraction: 0.03880000114440918
            },
            {
                color: { red: 208, green: 187, blue: 163, alpha: null },
                score: 0.052316103130578995,
                pixelFraction: 0.04613333195447922
            },
            {
                color: { red: 78, green: 50, blue: 32, alpha: null },
                score: 0.10333520174026489,
                pixelFraction: 0.06133333221077919
            },
            {
                color: { red: 53, green: 51, blue: 49, alpha: null },
                score: 0.08738700300455093,
                pixelFraction: 0.05700000002980232
            },
            {
                color: { red: 99, green: 69, blue: 49, alpha: null },
                score: 0.08692975342273712,
                pixelFraction: 0.16233333945274353
            },
            {
                color: { red: 40, green: 49, blue: 69, alpha: null },
                score: 0.08483242988586426,
                pixelFraction: 0.030533334240317345
            },
            {
                color: { red: 94, green: 78, blue: 58, alpha: null },
                score: 0.08226968348026276,
                pixelFraction: 0.04553333297371864
            },
            {
                color: { red: 173, green: 153, blue: 130, alpha: null },
                score: 0.05002196505665779,
                pixelFraction: 0.05886666849255562
            },
            {
                color: { red: 135, green: 116, blue: 95, alpha: null },
                score: 0.04469913989305496,
                pixelFraction: 0.029133332893252373
            },
            {
                color: { red: 208, green: 1, blue: 1, alpha: null },
                score: 0.052316103130578995,
                pixelFraction: 0.04613333195447922
            },
            {
                color: { red: 1, green: 200, blue: 1, alpha: null },
                score: 0.052316103130578995,
                pixelFraction: 0.04613333195447922
            }
        ];

        // test objects
        const objects = [{
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Cat',
                score: 0.9384204149246216,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Cat',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Cat',
                score: 0.7174134850502014,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Lass',
                score: 0.7174134850502014,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Lass',
                score: 0.7174134850502014,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Moose',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Poop',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Hat',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Food',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            }, ,
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Car',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            },
            {
                mid: '/m/01yrx',
                languageCode: '',
                name: 'Violin',
                score: 0.9347373843193054,
                boundingPoly: { vertices: [], normalizedVertices: [Array] }
            }
        ];

        // test Faces

        let faces = [{
                landmarks: [
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object]
                ],
                boundingPoly: { vertices: [Array], normalizedVertices: [] },
                fdBoundingPoly: { vertices: [Array], normalizedVertices: [] },
                rollAngle: -10.881768226623535,
                panAngle: -43.29533767700195,
                tiltAngle: 10.26768970489502,
                detectionConfidence: 0.9458194375038147,
                landmarkingConfidence: 0.4563596546649933,
                joyLikelihood: 'VERY_LIKELY',
                sorrowLikelihood: 'VERY_UNLIKELY',
                angerLikelihood: 'VERY_UNLIKELY',
                surpriseLikelihood: 'VERY_UNLIKELY',
                underExposedLikelihood: 'VERY_UNLIKELY',
                blurredLikelihood: 'VERY_UNLIKELY',
                headwearLikelihood: 'VERY_UNLIKELY'
            },
            {
                landmarks: [
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object],
                    [Object]
                ],
                boundingPoly: { vertices: [Array], normalizedVertices: [] },
                fdBoundingPoly: { vertices: [Array], normalizedVertices: [] },
                rollAngle: 2.772660970687866,
                panAngle: 30.252716064453125,
                tiltAngle: -16.362014770507812,
                detectionConfidence: 0.9679335355758667,
                landmarkingConfidence: 0.2709555923938751,
                joyLikelihood: 'VERY_LIKELY',
                sorrowLikelihood: 'VERY_UNLIKELY',
                angerLikelihood: 'VERY_UNLIKELY',
                surpriseLikelihood: 'VERY_UNLIKELY',
                underExposedLikelihood: 'VERY_UNLIKELY',
                blurredLikelihood: 'VERY_UNLIKELY',
                headwearLikelihood: 'VERY_UNLIKELY'
            }
        ];

        let landmarks = [{
                description: "Eiffel Tower"
            },
            {
                description: "another place that is cool"
            },
            {
                description: "third place that is cool"
            }
        ]

        let noLandmarks = [];
        let searchTerms = [];


        addColors(searchTerms, colors);
        addFaces(searchTerms, faces);
        addLandmarks(searchTerms, landmarks);
        addObjects(searchTerms, objects);
        addLabels(searchTerms, labels);
        title = generateTitle(colors, landmarks, labels);
        // searchTerms.forEach(t => console.log(t.value));

        return { title: title, terms: searchTerms };
    }
    // test();

module.exports.getImageData = getImageData; //CHANGE!