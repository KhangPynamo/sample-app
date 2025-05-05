import * as aws from "@pulumi/aws";
import * as path from 'path';

// Configurations and Helpers
import { globalTags, getResourceName } from "./config";

// Cloud Resources
import { LambdaFunctionImage } from "./resources/aws/lambdaFunction/lambdaFunctionImage";
import { EcrRepository, EcrRepositoryPush } from "./resources/aws/ecrRepository";
import { S3Bucket } from "./resources/aws/s3Bucket";

// Cloud Provider: AWS
const awsProvider = new aws.Provider("aws", {
    profile: "renovalab",
    region: "ap-southeast-1",
});

// Resource: S3 Bucket
const bucket = new S3Bucket(getResourceName("bucket"), {
    tags: {
        ...globalTags,
        Resource: "Storage",
    },
}, { provider: awsProvider });
export const bucketName = bucket.id;

// Resource: ECR Repository
const ecrRepo = new EcrRepository(getResourceName("chatbot"), {
    tags: {
        ...globalTags,
        Resource: "Container",
    },
    imageTagMutability: "IMMUTABLE",
    scanOnPush: true,
}, { provider: awsProvider });
export const ecrRepositoryUrl = ecrRepo.repositoryUrl;

const chatbotAppImage = new EcrRepositoryPush(getResourceName("chatbot-image"), {
    repositoryUrl: ecrRepo.repositoryUrl,
    context: path.join(__dirname, "../apps/chat"),
    dockerfile: path.join(__dirname, "../apps/chat/Dockerfile"),
    platform: "linux/arm64",
    versionFilePath: path.join(__dirname, "../apps/chat/VERSION"),
}, { provider: awsProvider, dependsOn: [ecrRepo] });
export const chatbotAppImageName = chatbotAppImage.imageUri;

// Resource: Lambda Function
const chatbotLambda = new LambdaFunctionImage(getResourceName("chatbot-lambda"), {
    ecrImageUri: chatbotAppImage.imageUri,
    ecrRepositoryArn: ecrRepo.repository.repository.arn,
    ecrRepositoryUrl: ecrRepo.repositoryUrl,
    functionName: getResourceName("chatbot-lambda"),
    memorySize: 512,
    timeout: 60,
    tags: {
        ...globalTags,
        Resource: "Lambda",
    },
}, { provider: awsProvider, dependsOn: [chatbotAppImage] });
export const chatbotLambdaArn = chatbotLambda.functionArn;