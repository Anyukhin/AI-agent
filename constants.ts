
import { GraphData, PromptDefinition, GigaChatModel, OntologyNode, OntologyLink } from './types';

export const ROUTERAI_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Google: Gemini 3 Flash (Recommended)' },
  { id: 'deepseek/deepseek-chat-v3.1', name: 'DeepSeek: Chat V3.1' },
  { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
  { id: 'anthropic/claude-3-haiku', name: 'Anthropic: Claude 3 Haiku' }
];

export const GIGACHAT_MODELS = [
  { id: GigaChatModel.GigaChat, name: 'GigaChat (Standard)' },
  { id: GigaChatModel.GigaChatPro, name: 'GigaChat Pro' },
  { id: GigaChatModel.GigaChatMax, name: 'GigaChat Max' }
];

const DEFAULT_INCOSE_PROMPT = `
# РОЛЬ
Ты — ведущий системный аналитик с многолетним опытом в инженерии требований. Твоя основная компетенция — это оценка и улучшение качества технических спецификаций и пользовательских историй согласно руководству INCOSE.

# КОНТЕКСТ
Тебе нужно провести аудит набора требований к системе. Используй следующие правила и характеристики качества:

{ontology_context}

# ЗАДАЧА
Проанализируй каждое требование из списка на соответствие свойствам и правилам.

Для каждого отдельного требования выполни следующие шаги:
1. Проверка: Последовательно проверь требование на соответствие правилам (R1-R44) и свойствам (C1-C14).
2. Идентификация проблем: Если требование нарушает правило, укажи ID и название.
3. Объяснение: Кратко объясни проблему.
4. Рекомендация: Предложи переформулированную версию.

# ФОРМАТ ВЫВОДА
Используй Markdown. Для каждого требования:

### Анализ Требования: [ID или текст]
**Оригинал:** "..."

**Результаты:**
| Правило/Свойство | Статус | Комментарий |
| :--- | :--- | :--- |
| [Rxx - Название] | НАРУШЕНИЕ | ... |

**Итог:**
* **Проблемы:** ...
* **Рекомендация:** "..."
`;

const STRICT_PROMPT = `
# РОЛЬ
Строгий аудитор требований.

# КОНТЕКСТ
{ontology_context}

# ЗАДАЧА
Ты должен найти КАЖДОЕ малейшее нарушение правил INCOSE. Не будь снисходителен.
Если требование идеальное, напиши "CORRECT".
Если есть нарушения, выведи список нарушенных правил и исправленную версию.

Формат:
1. [Текст требования]
   - Нарушения: [Список кодов правил]
   - Исправление: [Текст]
`;

const EDUCATIONAL_PROMPT = `
# РОЛЬ
Преподаватель по системному анализу.

# КОНТЕКСТ
{ontology_context}

# ЗАДАЧА
Проанализируй требования. Для каждой ошибки дай развернутое объяснение, почему это плохо для архитектуры системы, ссылаясь на определения характеристик (C1-C7).
Твоя цель - научить пользователя писать требования лучше.
`;

export const PRELOADED_PROMPTS: PromptDefinition[] = [
  {
    id: 'default',
    name: 'Стандартный INCOSE (Standard)',
    description: 'Полный анализ с таблицей нарушений и рекомендациями.',
    template: DEFAULT_INCOSE_PROMPT
  },
  {
    id: 'strict',
    name: 'Строгий Аудитор (Strict)',
    description: 'Жесткая проверка на соответствие правилам, минимум объяснений.',
    template: STRICT_PROMPT
  },
  {
    id: 'educational',
    name: 'Обучающий режим (Educational)',
    description: 'Подробные объяснения причин ошибок с точки зрения архитектуры.',
    template: EDUCATIONAL_PROMPT
  }
];

const nodes: OntologyNode[] = [
  // Characteristics
  { id: 'C1', label: 'C1 - Необходимость', group: 'Characteristic', definition: 'Требование необходимо, если определяет важную способность.', rationale: 'Лишние требования — причина бесполезной работы.' },
  { id: 'C2', label: 'C2 - Адекватность уровню', group: 'Characteristic', definition: 'Степень детализации уместна для выбранного уровня сущности.' },
  { id: 'C3', label: 'C3 - Однозначность', group: 'Characteristic', definition: 'Требование имеет только одну интерпретацию.', rationale: 'Если стороны понимают по-своему, соглашение не имеет смысла.' },
  { id: 'C4', label: 'C4 - Полнота (требования)', group: 'Characteristic', definition: 'Содержит достаточно данных для разработки без доп. пояснений.' },
  { id: 'C5', label: 'C5 - Простота', group: 'Characteristic', definition: 'Указано только одно обязательство (одна мысль).' },
  { id: 'C6', label: 'C6 - Реализуемость (требования)', group: 'Characteristic', definition: 'Можно реализовать с приемлемым риском в заданных ограничениях.' },
  { id: 'C7', label: 'C7 - Пригодность для верификации', group: 'Characteristic', definition: 'Можно однозначно проверить его выполнение.' },
  { id: 'C8', label: 'C8 - Соответствие потребности', group: 'Characteristic', definition: 'Точно отражает потребность заинтересованной стороны.' },
  { id: 'C9', label: 'C9 - Соответствие нормам', group: 'Characteristic', definition: 'Отвечает стандартным паттернам и стилю написания.' },
  { id: 'C10', label: 'C10 - Полнота (набора)', group: 'Characteristic', definition: 'Набор содержит все данные для удовлетворения потребности.' },
  { id: 'C11', label: 'C11 - Непротиворечивость', group: 'Characteristic', definition: 'Требования в наборе не конфликтуют и не пересекаются.' },
  { id: 'C12', label: 'C12 - Реализуемость (набора)', group: 'Characteristic', definition: 'Набор можно выполнить целиком в рамках ограничений.' },
  { id: 'C13', label: 'C13 - Понятность', group: 'Characteristic', definition: 'Содержит ясное описание ожиданий сущности.' },
  { id: 'C14', label: 'C14 - Валидируемость', group: 'Characteristic', definition: 'Можно доказать, что реализация удовлетворит потребности.' },
  // Rules
  { id: 'R1', label: 'R1 - Определенные артикли', group: 'Rule', definition: 'Явно указывать на конкретную сущность.', example: 'Плохо: Система должна показывать время. Хорошо: Система должна показывать Текущее_Время.' },
  { id: 'R2', label: 'R2 - Активный залог', group: 'Rule', definition: 'Сущность должна быть явно обозначена и совершать действие.' },
  { id: 'R3', label: 'R3 - Адекватное подлежащее', group: 'Rule', definition: 'Подлежащее должно соответствовать уровню системы.' },
  { id: 'R4', label: 'R4 - Установленные термины', group: 'Rule', definition: 'Использовать термины глоссария единообразно.' },
  { id: 'R6', label: 'R6 - Единицы измерения', group: 'Rule', definition: 'Каждое числовое значение дополнять единицей измерения.' },
  { id: 'R7', label: 'R7 - Избегать неточных терминов', group: 'Rule', definition: 'Избегать слов: быстро, нормально, гибкий, примерно.' },
  { id: 'R9', label: 'R9 - Без снятия ответственности', group: 'Rule', definition: 'Избегать: при необходимости, по возможности.' },
  { id: 'R10', label: 'R10 - Исчерпывающая мысль', group: 'Rule', definition: 'Не использовать "и т.д.", "и прочее".' },
  { id: 'R11', label: 'R11 - Без нанизывания глаголов', group: 'Rule', definition: 'Избегать "быть способна". Писать "Система должна...".' },
  { id: 'R12', label: 'R12 - Разделять предложения', group: 'Rule', definition: 'Одно требование - одно предложение.' },
  { id: 'R13', label: 'R13 - Грамматика', group: 'Rule', definition: 'Соблюдать правила грамматики.' },
  { id: 'R14', label: 'R14 - Орфография', group: 'Rule', definition: 'Избегать опечаток.' },
  { id: 'R15', label: 'R15 - Пунктуация', group: 'Rule', definition: 'Правильная пунктуация критична для смысла.' },
  { id: 'R16', label: 'R16 - Логические операторы', group: 'Rule', definition: 'Явно выделять И, ИЛИ, НЕ. Избегать "и/или".' },
  { id: 'R17', label: 'R17 - Избегать частицы НЕ', group: 'Rule', definition: 'Избегать отрицаний, их сложно верифицировать.' },
  { id: 'R18', label: 'R18 - Избегать косой черты', group: 'Rule', definition: 'Знак "/" неоднозначен.' },
  { id: 'R19', label: 'R19 - Одно предложение', group: 'Rule', definition: 'Одна мысль в одном предложении.' },
  { id: 'R20', label: 'R20 - Избегать союзов', group: 'Rule', definition: 'Союзы объединяют разные требования. Разделите их.' },
  { id: 'R22', label: 'R22 - Без назначения внутри', group: 'Rule', definition: 'Не пишите "для того чтобы...". Используйте Обоснование.' },
  { id: 'R23', label: 'R23 - Без скобок', group: 'Rule', definition: 'Текст в скобках часто лишний.' },
  { id: 'R24', label: 'R24 - Перечислять явно', group: 'Rule', definition: 'Не используйте обобщающие слова.' },
  { id: 'R25', label: 'R25 - Контекст (ссылки)', group: 'Rule', definition: 'Для сложного поведения ссылайтесь на диаграммы.' },
  { id: 'R26', label: 'R26 - Избегать местоимений', group: 'Rule', definition: 'Не используйте "он", "это". Повторяйте существительное.' },
  { id: 'R27', label: 'R27 - Без заголовков', group: 'Rule', definition: 'Требование должно быть понятно без заголовка.' },
  { id: 'R28', label: 'R28 - Без абсолютов', group: 'Rule', definition: 'Избегать: всегда, никогда, 100%.' },
  { id: 'R29', label: 'R29 - Явная применимость', group: 'Rule', definition: 'Условия (когда, где) должны быть в тексте.' },
  { id: 'R30', label: 'R30 - Логика условий', group: 'Rule', definition: 'Явно указывать логику списка условий.' },
  { id: 'R31', label: 'R31 - Классификация', group: 'Rule', definition: 'Использовать атрибуты типа/категории.' },
  { id: 'R32', label: 'R32 - Записывать один раз', group: 'Rule', definition: 'Избегать дубликатов.' },
  { id: 'R33', label: 'R33 - ЧТО, а не КАК', group: 'Rule', definition: 'Писать "ЧТО" нужно, а не решение реализации.' },
  { id: 'R34', label: 'R34 - Использовать "Каждый"', group: 'Rule', definition: 'Вместо "все" или "любой".' },
  { id: 'R35', label: 'R35 - Диапазон значений', group: 'Rule', definition: 'Указывать допуски (±) или диапазоны.' },
  { id: 'R36', label: 'R36 - Измеримость', group: 'Rule', definition: 'Значения должны быть измеримыми.' },
  { id: 'R37', label: 'R37 - Время количественно', group: 'Rule', definition: 'Указывать секунды/миллисекунды.' },
  { id: 'R38', label: 'R38 - Термины в наборе', group: 'Rule', definition: 'Один термин - одно значение во всем наборе.' },
  { id: 'R39', label: 'R39 - Аббревиатуры', group: 'Rule', definition: 'Использовать единообразно.' },
  { id: 'R40', label: 'R40 - Без сокращений', group: 'Rule', definition: 'Не сокращать слова в тексте требования.' },
  { id: 'R41', label: 'R41 - Руководство по стилю', group: 'Rule', definition: 'Использовать единый стиль проекта.' },
  { id: 'R43', label: 'R43 - Группировка', group: 'Rule', definition: 'Связанные требования должны быть рядом.' },
  { id: 'R44', label: 'R44 - Типовая структура', group: 'Rule', definition: 'Использовать паттерны и шаблоны.' }
];

const links: OntologyLink[] = [
  { source: 'R1', target: 'C3', type: 'supports' }, { source: 'R1', target: 'C7', type: 'supports' },
  { source: 'R2', target: 'C2', type: 'supports' }, { source: 'R2', target: 'C3', type: 'supports' }, { source: 'R2', target: 'C7', type: 'supports' },
  { source: 'R3', target: 'C2', type: 'supports' }, { source: 'R3', target: 'C3', type: 'supports' }, { source: 'R3', target: 'C7', type: 'supports' }, { source: 'R3', target: 'C10', type: 'supports' }, { source: 'R3', target: 'C14', type: 'supports' },
  { source: 'R4', target: 'C3', type: 'supports' }, { source: 'R4', target: 'C7', type: 'supports' }, { source: 'R4', target: 'C11', type: 'supports' }, { source: 'R4', target: 'C13', type: 'supports' }, { source: 'R4', target: 'C14', type: 'supports' },
  { source: 'R6', target: 'C3', type: 'supports' }, { source: 'R6', target: 'C4', type: 'supports' }, { source: 'R6', target: 'C7', type: 'supports' }, { source: 'R6', target: 'C8', type: 'supports' },
  { source: 'R7', target: 'C3', type: 'supports' }, { source: 'R7', target: 'C4', type: 'supports' }, { source: 'R7', target: 'C7', type: 'supports' },
  { source: 'R9', target: 'C3', type: 'supports' }, { source: 'R9', target: 'C4', type: 'supports' }, { source: 'R9', target: 'C7', type: 'supports' },
  { source: 'R10', target: 'C3', type: 'supports' }, { source: 'R10', target: 'C4', type: 'supports' }, { source: 'R10', target: 'C5', type: 'supports' }, { source: 'R10', target: 'C7', type: 'supports' },
  { source: 'R11', target: 'C3', type: 'supports' }, { source: 'R11', target: 'C7', type: 'supports' },
  { source: 'R12', target: 'C3', type: 'supports' },
  { source: 'R13', target: 'C3', type: 'supports' }, { source: 'R13', target: 'C9', type: 'supports' },
  { source: 'R14', target: 'C3', type: 'supports' },
  { source: 'R15', target: 'C3', type: 'supports' },
  { source: 'R16', target: 'C3', type: 'supports' },
  { source: 'R17', target: 'C3', type: 'supports' }, { source: 'R17', target: 'C7', type: 'supports' },
  { source: 'R18', target: 'C3', type: 'supports' },
  { source: 'R19', target: 'C3', type: 'supports' }, { source: 'R19', target: 'C5', type: 'supports' }, { source: 'R19', target: 'C9', type: 'supports' },
  { source: 'R20', target: 'C3', type: 'supports' }, { source: 'R20', target: 'C5', type: 'supports' },
  { source: 'R22', target: 'C5', type: 'supports' },
  { source: 'R23', target: 'C5', type: 'supports' },
  { source: 'R24', target: 'C3', type: 'supports' }, { source: 'R24', target: 'C5', type: 'supports' },
  { source: 'R25', target: 'C3', type: 'supports' }, { source: 'R25', target: 'C5', type: 'supports' },
  { source: 'R26', target: 'C3', type: 'supports' }, { source: 'R26', target: 'C4', type: 'supports' }, { source: 'R26', target: 'C7', type: 'supports' },
  { source: 'R27', target: 'C4', type: 'supports' },
  { source: 'R28', target: 'C6', type: 'supports' }, { source: 'R28', target: 'C7', type: 'supports' }, { source: 'R28', target: 'C12', type: 'supports' },
  { source: 'R29', target: 'C4', type: 'supports' }, { source: 'R29', target: 'C7', type: 'supports' },
  { source: 'R30', target: 'C3', type: 'supports' }, { source: 'R30', target: 'C7', type: 'supports' },
  { source: 'R31', target: 'C10', type: 'supports' }, { source: 'R31', target: 'C11', type: 'supports' }, { source: 'R31', target: 'C12', type: 'supports' },
  { source: 'R32', target: 'C1', type: 'supports' }, { source: 'R32', target: 'C9', type: 'supports' }, { source: 'R32', target: 'C11', type: 'supports' }, { source: 'R32', target: 'C12', type: 'supports' },
  { source: 'R33', target: 'C2', type: 'supports' },
  { source: 'R34', target: 'C3', type: 'supports' }, { source: 'R34', target: 'C7', type: 'supports' }, { source: 'R34', target: 'C8', type: 'supports' },
  { source: 'R35', target: 'C3', type: 'supports' }, { source: 'R35', target: 'C6', type: 'supports' }, { source: 'R35', target: 'C7', type: 'supports' }, { source: 'R35', target: 'C8', type: 'supports' }, { source: 'R35', target: 'C10', type: 'supports' }, { source: 'R35', target: 'C12', type: 'supports' },
  { source: 'R36', target: 'C3', type: 'supports' }, { source: 'R36', target: 'C7', type: 'supports' }, { source: 'R36', target: 'C10', type: 'supports' }, { source: 'R36', target: 'C12', type: 'supports' },
  { source: 'R37', target: 'C3', type: 'supports' }, { source: 'R37', target: 'C7', type: 'supports' }, { source: 'R37', target: 'C10', type: 'supports' },
  { source: 'R38', target: 'C3', type: 'supports' }, { source: 'R38', target: 'C8', type: 'supports' }, { source: 'R38', target: 'C9', type: 'supports' }, { source: 'R38', target: 'C11', type: 'supports' }, { source: 'R38', target: 'C13', type: 'supports' }, { source: 'R38', target: 'C14', type: 'supports' },
  { source: 'R39', target: 'C3', type: 'supports' }, { source: 'R39', target: 'C9', type: 'supports' }, { source: 'R39', target: 'C11', type: 'supports' }, { source: 'R39', target: 'C13', type: 'supports' }, { source: 'R39', target: 'C14', type: 'supports' },
  { source: 'R40', target: 'C11', type: 'supports' }, { source: 'R40', target: 'C13', type: 'supports' }, { source: 'R40', target: 'C14', type: 'supports' },
  { source: 'R41', target: 'C5', type: 'supports' }, { source: 'R41', target: 'C9', type: 'supports' }, { source: 'R41', target: 'C11', type: 'supports' }, { source: 'R41', target: 'C13', type: 'supports' }, { source: 'R41', target: 'C14', type: 'supports' },
  { source: 'R43', target: 'C9', type: 'supports' }, { source: 'R43', target: 'C11', type: 'supports' }, { source: 'R43', target: 'C13', type: 'supports' },
  { source: 'R44', target: 'C10', type: 'supports' }, { source: 'R44', target: 'C11', type: 'supports' }, { source: 'R44', target: 'C13', type: 'supports' }, { source: 'R44', target: 'C14', type: 'supports' }
];

export const INCOSE_DATA: GraphData = {
  nodes,
  links
};
