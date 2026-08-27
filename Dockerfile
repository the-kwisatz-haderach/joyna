FROM golang:1.27.0-alpine3.24 AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api

FROM alpine:3.24

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /bin/api .

USER app

EXPOSE 8080

ENTRYPOINT ["./api"]
