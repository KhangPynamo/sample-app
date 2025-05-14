import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const environment = config.require("env");
const prefix = config.require("prefix");
const project = config.require("project");
const owner = config.require("owner");

export const getResourceName = (
  resource: string,
  component?: string
): string => {
  let name = `${prefix}-${environment}-${resource}`;
  if (component) {
    name += `-${component}`;
  }
  return name;
};

export const getGlobalTags = (): Record<string, string> => ({
  Project: project,
  "Managed By": "Pulumi",
  Owner: owner,
  Environment: environment,
});
