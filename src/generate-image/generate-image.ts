import AWS from 'aws-sdk';
import axios from 'axios';
import Jimp from 'jimp';
import { APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuid } from 'uuid';

type DetectLabelsRequest = AWS.Rekognition.DetectLabelsRequest;
type DetectLabelsResponse = AWS.Rekognition.DetectLabelsResponse;
type S3ObjectLambdaEvent = {
  getObjectContext: {
    outputRoute: string;
    outputToken: string;
    inputS3Url: string;
  };
};

const METHOD = 'generate-image.handler';

const s3 = new AWS.S3();
const client = new AWS.Rekognition();

export const handler = async ({
  getObjectContext: { outputRoute, outputToken, inputS3Url },
}: S3ObjectLambdaEvent): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();

    console.log(`${correlationId} - ${METHOD} - started`);

    // get the original image using the presigned URL on the event and return as a buffer
    const { data: requestedImage } = await axios.get(inputS3Url, { responseType: 'arraybuffer' });

    const imageRequest: DetectLabelsRequest = {
      Image: { Bytes: requestedImage },
      MinConfidence: 70,
      MaxLabels: 5,
    };

    // detect the labels using Amazon Rekognition
    const items: DetectLabelsResponse = await client.detectLabels(imageRequest).promise();

    console.log(`${correlationId} - ${METHOD} - labels: ${items}`);

    const labelsText = items.Labels ? items.Labels.map((label) => label.Name).join() : 'No labels found';

    // load the image into jimp and add the labels as watermarks (comma seperated)
    const image: Buffer = await Jimp.read(requestedImage).then(async (image: Jimp) => {
      const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
      image.print(font, 10, 10, labelsText, 400);

      return await image.getBufferAsync(Jimp.MIME_PNG);
    });

    // return the updated image in the response to the Get Object
    await s3
      .writeGetObjectResponse({
        RequestRoute: outputRoute,
        RequestToken: outputToken,
        Body: image,
      })
      .promise();

    return {
      statusCode: 200,
      body: 'success',
    };
  } catch (error: any) {
    console.error(`${METHOD} - error: ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify('errorMessage', null, 2),
    };
  }
};
