import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as path from "path";
import * as fs from "fs";

import { readFile } from "./config/readFile"
import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

const awsProvider = getAwsProvider();

const ecrRepo = new awsx.ecr.Repository(
    getResourceName("chatbot"),
    {
        tags: {
            ...getGlobalTags(),
            Resource: "Container",
        },
        imageTagMutability: "IMMUTABLE",
        imageScanningConfiguration: {
            scanOnPush: true,
        },
    },
    { provider: awsProvider }
);

const appVersion = readFile(path.join(__dirname, "../apps/chat/VERSION"));

const chatbotAppImage = new awsx.ecr.Image(
    getResourceName("chatbot-image"),
    {
        repositoryUrl: ecrRepo.url,
        context: path.join(__dirname, "../apps/chat"),
        dockerfile: path.join(__dirname, "../apps/chat/Dockerfile"),
        platform: "linux/arm64",
        imageTag: appVersion,
    },
    { provider: awsProvider, dependsOn: [ecrRepo] }
);

const chatbotLambdaRole = new aws.iam.Role(
    getResourceName("chatbot-lambda-role"),
    {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com",
        }),
        tags: {
            ...getGlobalTags(),
            Resource: "IAMRole",
        },
    },
    { provider: awsProvider }
);

new aws.iam.RolePolicyAttachment(
    getResourceName("chatbot-lambda-policy-basic-execution"),
    {
        role: chatbotLambdaRole.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
    },
    { provider: awsProvider, parent: chatbotLambdaRole }
);

new aws.iam.RolePolicyAttachment(
    getResourceName("chatbot-lambda-policy-vpc-access"),
    {
        role: chatbotLambdaRole.name,
        policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
    },
    { provider: awsProvider, parent: chatbotLambdaRole }
);

new aws.iam.RolePolicy(
    getResourceName("chatbot-lambda-ecr-policy"),
    {
        role: chatbotLambdaRole.name,
        policy: pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": ["ecr:BatchGetImage", "ecr:GetDownloadToken"],
                    "Effect": "Allow",
                    "Resource": "${ecrRepo.repository.arn}"
                }
            ]
        }`,
    },
    { provider: awsProvider, parent: chatbotLambdaRole }
);

const chatbotLambdaFunction = new aws.lambda.Function(
    getResourceName("chatbot-lambda"),
    {
        packageType: "Image",
        imageUri: chatbotAppImage.imageUri,
        memorySize: 512,
        timeout: 60,
        role: chatbotLambdaRole.arn,
        name: getResourceName("chatbot-lambda"),
        tags: {
            ...getGlobalTags(),
            Resource: "Lambda",
        },
    },
    { provider: awsProvider, dependsOn: [chatbotAppImage] }
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
        integrationUri: chatbotLambdaFunction.arn,
        integrationMethod: "POST",
    },
    { provider: awsProvider, dependsOn: [websocketApi, chatbotLambdaFunction] }
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
            function: chatbotLambdaFunction.arn,
            principal: "apigateway.amazonaws.com",
            sourceArn: pulumi.interpolate`${websocketApi.executionArn}/*/${routeKey}`,
        },
        { provider: awsProvider, dependsOn: [websocketApi, chatbotLambdaFunction] }
    );
});

export const lambdaFunctionArn = chatbotLambdaFunction.arn;
export const websocketApiUrl = websocketApi.apiEndpoint;
export const ecrRepositoryUrl = ecrRepo.url;
export const ecrRepositoryArn = ecrRepo.repository.arn;