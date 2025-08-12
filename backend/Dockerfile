FROM python:3.12-alpine

# Install build tools and headers
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    python3-dev \
    cargo

WORKDIR /opt/app
COPY . .
WORKDIR /opt/app/backend

RUN pip3 install --upgrade pip
RUN pip3 install -r requirements.txt

ENV FLASK_APP=/opt/app/backend/server.py
EXPOSE 8000
ENTRYPOINT ["python"]
CMD ["-m", "flask", "run", "--host=0.0.0.0", "--port=8000"]
