import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";

export const readFile = (filePath: string): pulumi.Output<string> => {
  return pulumi.output(filePath).apply((filePath) => {
    try {
      const rawData = fs.readFileSync(filePath, "utf-8");
      return rawData.trim();
    } catch (error: any) {
      throw new Error(
        `Failed to read content from ${filePath}: ${error.message}`
      );
    }
  });
};
