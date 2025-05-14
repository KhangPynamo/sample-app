import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createEcrRepository, pushImageECR } from "./infra/aws/ecr";
import { createLambdaFunctionImage } from "./infra/aws/lambda";

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

const websocketApi = new aws.apigatewayv2.Api(
    getResourceName("websocket-chat-api"),
    {
        name: getResourceName("websocket-chat-api"),
        protocolType: "WEBSOCKET",
        routeSelectionExpression: "$request.body.action",
        tags: {
            ...getGlobalTags(),
            Resource: "API",
            Type: "WebSocket",
        },
    },
    { provider: awsProvider }
);

const lambdaIntegration = new aws.apigatewayv2.Integration(
    getResourceName("chatbot-integration"),
    {
        apiId: websocketApi.id,
        integrationType: "AWS_PROXY",
        integrationUri: chatbotLambda.lambdaFunctionArn,
        integrationMethod: "POST",
    },
    { provider: awsProvider, dependsOn: [websocketApi] }
);

const routes = ["$connect", "$disconnect", "sendmessage"];

routes.forEach((routeKey) => {
    new aws.apigatewayv2.Route(
        getResourceName(`websocket-route-${routeKey.replace("$", "")}`),
        {
            apiId: websocketApi.id,
            routeKey: routeKey,
            target: pulumi.interpolate`integrations/${lambdaIntegration.id}`,
        },
        { provider: awsProvider, dependsOn: [websocketApi, lambdaIntegration] }
    );

    new aws.lambda.Permission(
        getResourceName(`allow-apigw-invoke-${routeKey.replace("$", "")}`),
        {
            action: "lambda:InvokeFunction",
            function: chatbotLambda.lambdaFunctionArn,
            principal: "apigateway.amazonaws.com",
            sourceArn: pulumi.interpolate`${websocketApi.executionArn}/*/${routeKey}`,
        },
        { provider: awsProvider, dependsOn: [websocketApi] }
    );
});

export const websocketApiUrl = websocketApi.apiEndpoint;