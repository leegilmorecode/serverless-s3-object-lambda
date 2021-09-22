import AWS from 'aws-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { config } from '../config/config';

type GetObjectRequest = AWS.S3.GetObjectRequest;
type GetObjectOutput = AWS.S3.GetObjectOutput;

const METHOD = 'get-image.handler';

const s3 = new AWS.S3();

export const handler: APIGatewayProxyHandler = async ({
  pathParameters,
}: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  try {
    const correlationId = uuid();

    console.log(`${correlationId} - ${METHOD} - started`);

    // basic validation to check id exists - in reality the path parameter check would
    // happen using an approach like json schema validation
    if (!pathParameters?.id) {
      throw new Error('path parameter id does not exist');
    }

    const { id } = pathParameters;

    const imageKey = `${id}.png`;

    console.log(`${correlationId} - ${METHOD} - bucket access point: ${config.s3AccessPoint}, file: ${imageKey}`);

    const getRequest: GetObjectRequest = {
      Bucket: config.s3AccessPoint,
      Key: imageKey,
    };

    // get the image from the s3 bucket via the S3 Object Lambda Access Point
    const imageRequest: GetObjectOutput = await s3.getObject(getRequest).promise();

    if (!imageRequest.Body) {
      throw new Error(`image not found for key ${id}`);
    }

    // on success return the base64 of the manipulated image
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          image: imageRequest.Body.toString('base64'),
        },
        null,
        2,
      ),
    };
  } catch (error: any) {
    console.error(`${METHOD} - error: ${JSON.stringify(error)}`);

    // return a generic error otherwise
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify('An error has occurred', null, 2),
    };
  }
};
