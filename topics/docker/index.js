/**
 * Topic: Docker Containers
 */
const TOPIC_DOCKER = {
  "id": "docker",
  "icon": "🐳",
  "title": "Docker Containers",
  "description": "Learn containerized deployment, image management, and Compose orchestration",
  "sections": [
    {
      "title": "Basic Operations",
      "content": "\n          <pre><code># Pull an image\ndocker pull nginx:latest\n\n# Run a container\ndocker run -d -p 8080:80 --name web nginx\n\n# List running containers\ndocker ps\n\n# Stop/remove a container\ndocker stop web\ndocker rm web\n\n# View logs\ndocker logs -f web\n\n# Enter a container\ndocker exec -it web bash</code></pre>\n        "
    },
    {
      "title": "Dockerfile",
      "content": "\n          <pre><code>FROM node:20-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm ci --production\n\nCOPY . .\n\nEXPOSE 3000\n\nUSER node\nCMD [\"node\", \"server.js\"]</code></pre>\n          <pre><code># Build image\ndocker build -t myapp:1.0 .\n\n# Push to registry\ndocker tag myapp:1.0 registry.example.com/myapp:1.0\ndocker push registry.example.com/myapp:1.0</code></pre>\n        "
    },
    {
      "title": "Docker Compose",
      "content": "\n          <pre><code># docker-compose.yml\nversion: \"3.9\"\nservices:\n  web:\n    build: .\n    ports:\n      - \"3000:3000\"\n    environment:\n      - DB_HOST=db\n    depends_on:\n      - db\n\n  db:\n    image: postgres:16\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    environment:\n      - POSTGRES_PASSWORD=secret\n\nvolumes:\n  pgdata:</code></pre>\n          <pre><code># Start\ndocker compose up -d\n\n# Check status\ndocker compose ps\n\n# Stop and remove\ndocker compose down</code></pre>\n        "
    }
  ]
};
