# Open-weight vision model (SmolVLM2 2.2B, Apache-2.0) served by llama.cpp, run inside AWS Lambda
# through the AWS Lambda Web Adapter (AWS open source).
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 AS adapter
FROM ghcr.io/ggml-org/llama.cpp:server

COPY --from=adapter /lambda-adapter /opt/extensions/lambda-adapter

ADD https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/SmolVLM2-2.2B-Instruct-Q4_K_M.gguf /models/model.gguf
ADD https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-2.2B-Instruct-Q8_0.gguf /models/mmproj.gguf

ENV AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/health \
    AWS_LWA_ASYNC_INIT=true \
    HOME=/tmp

ENTRYPOINT ["/app/llama-server"]
CMD ["-m", "/models/model.gguf", "--mmproj", "/models/mmproj.gguf", "--host", "0.0.0.0", "--port", "8080", \
     "-c", "4096", "-t", "6", "--no-webui", "--no-warmup"]
