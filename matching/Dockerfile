FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

# Use WEB_CONCURRENCY env var if set (default to 1 for cloud platforms)
# The --workers flag is only used if WEB_CONCURRENCY is not set
ENV WEB_CONCURRENCY=1

CMD bash -c 'uvicorn main:app --host 0.0.0.0 --port 8001 --workers ${WEB_CONCURRENCY:-1}'
