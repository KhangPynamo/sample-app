import * as pulumi from "@pulumi/pulumi";
import * as fs from 'fs';
import * as path from 'path';

interface VariableConfig {
    project: string;
    prefix: string;
    owner: string;
}

const loadVariableConfig = (): VariableConfig => {
    const varConfigPath = path.join(__dirname, "variables.json");
    try {
        const rawData = fs.readFileSync(varConfigPath, 'utf-8');
        return JSON.parse(rawData) as VariableConfig;
    } catch (error: any) {
        throw new Error(`Failed to load variables from ${varConfigPath}: ${error.message}`);
    }
};

const varConfig = loadVariableConfig();
const projectName = varConfig.project;
const namePrefix = varConfig.prefix;
const owner = varConfig.owner;

const config = new pulumi.Config();
const environment = config.require("env");

export const getResourceName = (resourceName: string, componentName?: string): string => {
    let baseName = `${namePrefix}-${environment}-${resourceName}`;
    if (componentName) {
        baseName += `-${componentName}`;
    }
    return baseName;
};

export const globalTags = {
    Project: projectName,
    "Managed By": "Pulumi",
    Owner: owner,
    Environment: environment,
};