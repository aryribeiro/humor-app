#!/bin/bash
set -e

echo "=========================================="
echo "  Humor App! - AWS Deploy Script"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AWS_REGION="us-east-1"
ECR_STACK="humor-app-ecr"
IAM_STACK="humor-app-iam"
RUNNER_STACK="humor-app-runner"
IMAGE_NAME="humor-app-backend"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# 1. Validate prerequisites
echo -e "\n${YELLOW}[1/8] Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker not installed${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI not configured or credentials expired${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}Region: ${AWS_REGION}${NC}"

# 2. Deploy ECR stack
echo -e "\n${YELLOW}[2/8] Deploying ECR repository...${NC}"

aws cloudformation deploy \
    --template-file 01-ecr.yaml \
    --stack-name ${ECR_STACK} \
    --region ${AWS_REGION} \
    --no-fail-on-empty-changeset

REPOSITORY_URI=$(aws cloudformation describe-stacks \
    --stack-name ${ECR_STACK} \
    --region ${AWS_REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='RepositoryUri'].OutputValue" \
    --output text)

echo -e "${GREEN}ECR Repository: ${REPOSITORY_URI}${NC}"

# 3. Build Docker image
echo -e "\n${YELLOW}[3/8] Building Docker image...${NC}"

docker build -t ${IMAGE_NAME} ../backend

# 4. Push to ECR
echo -e "\n${YELLOW}[4/8] Pushing image to ECR...${NC}"

aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

docker tag ${IMAGE_NAME}:latest ${REPOSITORY_URI}:latest
docker tag ${IMAGE_NAME}:latest ${REPOSITORY_URI}:${TIMESTAMP}

docker push ${REPOSITORY_URI}:latest
docker push ${REPOSITORY_URI}:${TIMESTAMP}

echo -e "${GREEN}Pushed: ${REPOSITORY_URI}:latest${NC}"
echo -e "${GREEN}Pushed: ${REPOSITORY_URI}:${TIMESTAMP}${NC}"

# 5. Deploy IAM stack
echo -e "\n${YELLOW}[5/8] Deploying IAM roles...${NC}"

aws cloudformation deploy \
    --template-file 02-iam.yaml \
    --stack-name ${IAM_STACK} \
    --region ${AWS_REGION} \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset

INSTANCE_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name ${IAM_STACK} \
    --region ${AWS_REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='InstanceRoleArn'].OutputValue" \
    --output text)

ACCESS_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name ${IAM_STACK} \
    --region ${AWS_REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='AccessRoleArn'].OutputValue" \
    --output text)

echo -e "${GREEN}Instance Role: ${INSTANCE_ROLE_ARN}${NC}"
echo -e "${GREEN}Access Role: ${ACCESS_ROLE_ARN}${NC}"

# 6. Deploy App Runner stack
echo -e "\n${YELLOW}[6/8] Deploying App Runner service...${NC}"

aws cloudformation deploy \
    --template-file 03-apprunner.yaml \
    --stack-name ${RUNNER_STACK} \
    --region ${AWS_REGION} \
    --parameter-overrides \
        ImageUri=${REPOSITORY_URI}:latest \
        InstanceRoleArn=${INSTANCE_ROLE_ARN} \
        AccessRoleArn=${ACCESS_ROLE_ARN} \
    --no-fail-on-empty-changeset

# 7. Wait for App Runner to be running
echo -e "\n${YELLOW}[7/8] Waiting for App Runner to be running...${NC}"

SERVICE_ARN=$(aws cloudformation describe-stacks \
    --stack-name ${RUNNER_STACK} \
    --region ${AWS_REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ServiceArn'].OutputValue" \
    --output text)

while true; do
    STATUS=$(aws apprunner describe-service \
        --service-arn ${SERVICE_ARN} \
        --region ${AWS_REGION} \
        --query "Service.Status" \
        --output text)

    if [ "${STATUS}" = "RUNNING" ]; then
        echo -e "${GREEN}App Runner is RUNNING!${NC}"
        break
    elif [ "${STATUS}" = "CREATE_FAILED" ] || [ "${STATUS}" = "DELETE_FAILED" ]; then
        echo -e "${RED}App Runner failed with status: ${STATUS}${NC}"
        exit 1
    else
        echo "  Status: ${STATUS} - waiting..."
        sleep 10
    fi
done

# 8. Display final URL
echo -e "\n${YELLOW}[8/8] Getting service URL...${NC}"

SERVICE_URL=$(aws cloudformation describe-stacks \
    --stack-name ${RUNNER_STACK} \
    --region ${AWS_REGION} \
    --query "Stacks[0].Outputs[?OutputKey=='ServiceUrl'].OutputValue" \
    --output text)

echo ""
echo "=========================================="
echo -e "${GREEN}  DEPLOY COMPLETE!${NC}"
echo "=========================================="
echo ""
echo -e "Backend URL:  ${GREEN}${SERVICE_URL}${NC}"
echo -e "Health check: ${GREEN}${SERVICE_URL}/health${NC}"
echo ""
echo -e "${YELLOW}Next step:${NC}"
echo "  Configure NEXT_PUBLIC_WS_URL in Vercel with:"
echo -e "  ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo "  (Socket.IO runs over HTTP long-polling — use the https:// URL, not wss://)"
echo ""
