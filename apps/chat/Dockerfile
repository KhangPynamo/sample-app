FROM --platform=linux/arm64 public.ecr.aws/lambda/python:3.10

WORKDIR /var/task

ENV PYTHONPATH="/var/task:/var/task/libs"

COPY requirements.txt .
RUN pip install --target=libs -r requirements.txt

COPY src/ .

CMD ["chat.lambda_handler"]
