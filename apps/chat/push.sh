#!/bin/bash
PROFILE="renovalab"
REPOSITORY_NAME="ktl-dev-lambda-chat-lib"
TAG=$(cat VERSION)
ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)
REGION="ap-southeast-1"

aws ecr get-login-password --region $REGION --profile $PROFILE | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

docker build -t $REPOSITORY_NAME:$TAG .

docker tag $REPOSITORY_NAME:$TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:$TAG

docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:$TAG