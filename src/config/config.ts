interface Config {
  region: string;
  bucketName: string;
  s3AccessPoint: string;
}

export const config: Config = {
  region: process.env.REGION || 'eu-west-1',
  bucketName: process.env.BUCKET_NAME || 'image-metadata-development',
  s3AccessPoint: process.env.S3_ACCESS_POINT || '',
};
