import * as pulumi from "@pulumi/pulumi";

export interface ApiGatewayWebSocketArgs {
  name: pulumi.Input<string>;
  routeSelectionExpression?: pulumi.Input<string>;
  connectRouteOptions?: RouteOptions;
  disconnectRouteOptions?: RouteOptions;
  tags?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;
}

interface RouteOptions {
  integrationUri: pulumi.Input<string>;
}
