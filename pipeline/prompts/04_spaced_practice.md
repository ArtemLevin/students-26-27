# Этап 04 — безопасная привязка интервального повторения

Цель этапа — предложить проверяемое обновление метаданных урока и `practice-config.js`. Этот этап не изменяет браузерную историю попыток и не создаёт новые идентификаторы компетенций.

## Входы

1. итоговый `lesson-registry.js` и содержание текущего урока;
2. полный каталог компетенций ученика;
3. текущий `students/<student>/site/practice-config.js`;
4. реестр генераторов из `shared/practice/generators/index.js`.

## Обязательные правила

- Используйте только существующий `competencyId`, дословно взятый из каталога.
- Добавляйте `competencyId` к outcome лишь при однозначной связи с реально отработанным навыком.
- Используйте только зарегистрированный `generator` и убедитесь, что его `competencyIds` содержит выбранный ID.
- Сохраняйте `studentId`, `storageKey`, feature flags и существующие mappings.
- Не изменяйте `studentLevels`, `reviewQueue`, practice state, события, интервалы и прошлые сессии.
- Не повышайте mastery без evidence из урока.
- Новую mapping сначала оформляйте как migration-safe patch plan для ручной проверки.
- Для сложной геометрии, доказательств и неоднозначных ответов предлагайте curated bank; procedural generator не имитируйте.

## Выход

Верните:

1. список точных соответствий `lesson outcome → competencyId → generator key`;
2. минимальный patch для `lesson-registry.js`;
3. минимальный patch для `practice-config.js`;
4. команды проверки:

```bash
node shared/practice/validate-configs.mjs
node --test shared/practice/test/*.test.mjs
```

Если точного соответствия нет, явно укажите это и оставьте конфигурацию без изменений.
