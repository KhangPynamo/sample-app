import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  ApiGatewayWebSocketArgs,
  ApiGatewayWebSocketResult,
} from "./websocketArgs";

export function createWebSocketApiGateway(
  name: string,
  args: ApiGatewayWebSocketArgs,
  opts?: pulumi.ComponentResourceOptions
): ApiGatewayWebSocketResult {
  const api = new aws.apigatewayv2.Api(
    name,
    {
      name: args.name,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: args.routeSelectionExpression || "$request.body.action",
      tags: args.tags,
    },
    { provider: opts?.provider, parent: opts?.parent }
  );

  return {
    api: api.name,
    apiId: api.id,
  };
}
