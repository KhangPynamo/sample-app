import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { ApiGatewayWebSocketArgs } from "./apiGatewayWebSocketArgs";

class ApiGatewayWebSocket extends pulumi.ComponentResource {
  public readonly api: aws.apigatewayv2.Api;
  public readonly apiId: pulumi.Output<string>;
  public readonly connectRoute: aws.apigatewayv2.Route | undefined;
  public readonly disconnectRoute: aws.apigatewayv2.Route | undefined;

  constructor(
    name: string,
    args: ApiGatewayWebSocketArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("aws:apigatewayv2:Api", name, {}, opts);

    this.api = new aws.apigatewayv2.Api(
      name,
      {
        name: args.name,
        protocolType: "WEBSOCKET",
        routeSelectionExpression: args.routeSelectionExpression,
        tags: args.tags,
      },
      { provider: opts?.provider, parent: this }
    );

    this.apiId = this.api.id;

    this.registerOutputs({
      api: this.api,
      apiId: this.apiId,
      connectRoute: this.connectRoute,
      disconnectRoute: this.disconnectRoute,
    });
  }
}

export { ApiGatewayWebSocket };
