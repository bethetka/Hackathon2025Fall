# bethetka Hackathon 2025 Fall Solution

> Решение кейса от Aéza командой bethetka

Проект использует yarn latest, чтобы установить его необходимо выполнить:
```bash
$ corepack enable # может потребовать прав администратора
$ corepack prepare yarn@latest --activate
``` 

## frontend
Выполнен с помощью React, React-Query, React-Router, Vite, Tailwind, Shadcn.

В .env укажите VITE_API_URL, до бэкенда.

### Сборка
```bash
$ yarn build
```

### Разработка
```bash
$ yarn dev
```

## backend
Выполнен с помощью Moleculer, Moleculer-Web, TypeGoose, fastest-validator.

В .env для разработки укажите JWT_SECRET, JWT_MAGIC, MONGODB_URI, для production используйте docker compose

### Разработка
```bash
$ yarn start:dev
```