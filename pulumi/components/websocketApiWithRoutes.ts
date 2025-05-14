import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { getResourceName } from "../config/naming";
import { RouteOptions } from "../infra/aws/apiGateway/websocketArgs";

interface WebSocketApiWithRoutesArgs {
    name: string;
    routeSelectionExpression?: pulumi.Input<string>;
    routes: Record<string, RouteOptions>;
    lambdaFunctionArn: pulumi.Input<string>;
    tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

interface WebSocketApiWithRoutesResult {
    api: aws.apigatewayv2.Api;
    apiId: pulumi.Output<string>;
}

export class WebSocketApiWithRoutes extends pulumi.ComponentResource {
    public readonly api: aws.apigatewayv2.Api;
    public readonly apiId: pulumi.Output<string>;

    constructor(
        name: string,
        args: WebSocketApiWithRoutesArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("custom:components:WebSocketApiWithRoutes", name, args, opts);

        const api = new aws.apigatewayv2.Api(
            getResourceName(name),
            {
                name: getResourceName(args.name),
                protocolType: "WEBSOCKET",
                routeSelectionExpression: args.routeSelectionExpression || "$request.body.action",
                tags: args.tags,
            },
            { provider: opts?.provider, parent: this }
        );

        this.api = api;
        this.apiId = api.id;

        const lambdaIntegration = new aws.apigatewayv2.Integration(
            getResourceName(`${name}-integration`),
            {
                apiId: api.id,
                integrationType: "AWS_PROXY",
                integrationUri: args.lambdaFunctionArn,
                integrationMethod: "POST",
            },
            { provider: opts?.provider, parent: this }
        );

        for (const routeKey in args.routes) {
            const routeOptions = args.routes[routeKey];
            new aws.apigatewayv2.Route(
                getResourceName(`${name}-${routeKey}-route`),
                {
                    apiId: api.id,
                    routeKey: routeKey,
                    target: pulumi.interpolate`integrations/${lambdaIntegration.id}`,
                },
                { provider: opts?.provider, parent: this }
            );

            new aws.lambda.Permission(
                getResourceName(`allow-apigw-invoke-${name}-${routeKey.replace("$", "")}`),
                {
                    action: "lambda:InvokeFunction",
                    function: args.lambdaFunctionArn,
                    principal: "apigateway.amazonaws.com",
                    sourceArn: pulumi.interpolate`${api.executionArn}/*/${routeKey}`,
                },
                { provider: opts?.provider, parent: this }
            );
        }
    }
}