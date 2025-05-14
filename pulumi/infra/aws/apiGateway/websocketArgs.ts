import * as pulumi from "@pulumi/pulumi";

export interface RouteOptions {
  integrationUri?: pulumi.Input<string>;
}

export interface ApiGatewayWebSocketArgs {
  name: pulumi.Input<string>;
  routeSelectionExpression?: pulumi.Input<string>;
  connectRouteOptions?: RouteOptions;
  disconnectRouteOptions?: RouteOptions;
  tags?: pulumi.Input<Record<string, pulumi.Input<string>>>;
}

export interface ApiGatewayWebSocketResult {
  api: pulumi.Output<string>;
  apiId: pulumi.Output<string>;
}
