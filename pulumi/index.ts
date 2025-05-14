import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createEcrRepository, pushImageECR } from "./infra/aws/ecr";
import { createLambdaFunctionImage } from "./infra/aws/lambda";
// import { createWebSocketApiGateway } from "./infra/aws/apiGateway";
import { WebSocketApiWithRoutes } from "./components/websocketApiWithRoutes";

const awsProvider = getAwsProvider();

const ecrRepo = createEcrRepository(
  getResourceName("chatbot"),
  {
    tags: {
      ...getGlobalTags(),
      Resource: "Container",
    },
    imageTagMutability: "IMMUTABLE",
    scanOnPush: true,
  },
  { provider: awsProvider }
);

const chatbotAppImage = pushImageECR(
  getResourceName("chatbot-image"),
  {
    repositoryUrl: ecrRepo.repositoryUrl,
    context: path.join(__dirname, "../apps/chat"),
    dockerfile: path.join(__dirname, "../apps/chat/Dockerfile"),
    platform: "linux/arm64",
    versionFilePath: path.join(__dirname, "../apps/chat/VERSION"),
  },
  { provider: awsProvider, dependsOn: [ecrRepo.repository] }
);

const chatbotLambda = createLambdaFunctionImage(
  getResourceName("chatbot-lambda"),
  {
    ecrImageUri: chatbotAppImage.imageUri,
    ecrRepositoryArn: ecrRepo.repository.repository.arn,
    ecrRepositoryUrl: ecrRepo.repositoryUrl,
    functionName: getResourceName("chatbot-lambda"),
    memorySize: 512,
    timeout: 60,
    tags: {
      ...getGlobalTags(),
      Resource: "Lambda",
    },
  },
  { provider: awsProvider, dependsOn: [chatbotAppImage.image] }
);

// createWebSocketApiGateway(
//   getResourceName("websocket-chat-api"),
//   {
//     name: getResourceName("websocket-chat-api"),
//     routeSelectionExpression: "$request.body.action",
//     tags: {
//       ...getGlobalTags(),
//       Resource: "API",
//       Type: "WebSocket",
//     },
//   },
//   { provider: awsProvider }
// );

const chatWebSocketApi = new WebSocketApiWithRoutes(
    "websocket-chat-api",
    {
        name: "websocket-chat-api",
        routeSelectionExpression: "$request.body.action",
        routes: {
            "$connect": {},
            "$disconnect": {},
            "sendmessage": {},
        },
        lambdaFunctionArn: chatbotLambda.lambdaFunctionArn,
        tags: {
            ...getGlobalTags(),
            Resource: "API",
            Type: "WebSocket",
        },
    },
    { provider: awsProvider }
);

export const websocketApiUrl = chatWebSocketApi.api.apiEndpoint;