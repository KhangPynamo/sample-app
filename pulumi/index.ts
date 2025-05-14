import * as path from "path";

import { getGlobalTags, getResourceName } from "./config/naming";
import { getAwsProvider } from "./config/awsProvider";

import { createEcrRepository, pushImageECR } from "./infra/aws/ecr";

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
