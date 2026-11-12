const languageButtons = [...document.querySelectorAll('[data-language]')];
const languageStatus = document.querySelector('#language-status');
const themeButton = document.querySelector('#theme-toggle');
const translatableElements = [...document.querySelectorAll('[data-i18n]')];
const originalText = translatableElements.map(element => element.innerHTML);
const translatableAttributes = [...document.querySelectorAll('[data-i18n-aria-label]')];
const originalAriaLabels = translatableAttributes.map(element => element.getAttribute('aria-label'));
const birthDate = document.querySelector('[data-birth-date]').dataset.birthDate;
let languageRequestId = 0;

function getAge() {
    const [year, month, day] = birthDate.split('-').map(Number);
    const today = new Date();
    const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);

    return today.getFullYear() - year - (today < birthdayThisYear ? 1 : 0);
}

function updateAge() {
    document.querySelectorAll('[data-age]').forEach(element => {
        element.textContent = String(getAge());
    });
}

function scheduleAgeUpdate() {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    window.setTimeout(() => {
        updateAge();
        scheduleAgeUpdate();
    }, nextDay.getTime() - now.getTime() + 50);
}

function getPreference(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Could not read the saved ${key} preference.`, error);
        return null;
    }
}

function savePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`Could not save the ${key} preference.`, error);
    }
}

function updateTheme(isDark) {
    const isEnglish = document.documentElement.lang === 'en';
    document.documentElement.classList.toggle('dark-mode', isDark);
    themeButton.setAttribute('aria-pressed', String(isDark));
    themeButton.setAttribute(
        'aria-label',
        isDark
            ? (isEnglish ? 'Switch to light theme' : 'Cambiar a tema claro')
            : (isEnglish ? 'Switch to dark theme' : 'Cambiar a tema oscuro')
    );
}

function applyLanguage(language, dictionary = new Map()) {
    const isEnglish = language === 'en';

    if (isEnglish) {
        const keys = [
            ...translatableElements.map(element => element.dataset.i18n),
            ...translatableAttributes.map(element => element.dataset.i18nAriaLabel)
        ];
        const missingKeys = keys.filter(key => !dictionary.has(key));
        if (missingKeys.length) {
            throw new Error(`Missing translations in i18n/en.json: ${[...new Set(missingKeys)].join(', ')}`);
        }
    }

    document.documentElement.lang = language;

    translatableElements.forEach((element, index) => {
        const key = element.dataset.i18n;
        const template = isEnglish ? dictionary.get(key) : originalText[index];

        if (typeof template !== 'string') {
            throw new Error(`Missing translation for "${key}" in i18n/en.json.`);
        }

        if (element.hasAttribute('data-i18n-html')) {
            element.innerHTML = template;
        } else {
            element.textContent = template;
        }
    });

    translatableAttributes.forEach((element, index) => {
        element.setAttribute(
            'aria-label',
            isEnglish ? dictionary.get(element.dataset.i18nAriaLabel) : originalAriaLabels[index]
        );
    });

    languageButtons.forEach(button => {
        const isCurrentLanguage = button.dataset.language === language;
        button.setAttribute('aria-pressed', String(isCurrentLanguage));
        button.setAttribute('aria-label', isCurrentLanguage
            ? (isEnglish ? 'Current language: English' : 'Idioma actual: español')
            : (isEnglish ? 'Switch language to Spanish' : 'Cambiar idioma a inglés'));
    });

    const menuToggle = document.querySelector('.nav-toggle');
    const menuIsOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-label', isEnglish
        ? (menuIsOpen ? 'Close menu' : 'Open menu')
        : (menuIsOpen ? 'Cerrar menú' : 'Abrir menú'));

    updateTheme(document.documentElement.classList.contains('dark-mode'));
    updateAge();
    languageStatus.textContent = '';
}

async function setLanguage(language) {
    const requestId = ++languageRequestId;
    let dictionary = new Map();

    if (language === 'en') {
        const response = await fetch('i18n/en.json');
        if (!response.ok) {
            throw new Error(`Could not load i18n/en.json (${response.status}).`);
        }
        const config = await response.json();
        if (
            config.lang !== 'en'
            || typeof config.ruta !== 'string'
            || !Array.isArray(config.patrones)
            || !Array.isArray(config.reemplazos)
        ) {
            throw new Error('Invalid English translation configuration in i18n/en.json.');
        }

        if (config.reemplazos.some(({ clave, en }) =>
            typeof clave !== 'string' || typeof en !== 'string'
        )) {
            throw new Error('Invalid translation entry in i18n/en.json.');
        }

        dictionary = new Map(config.reemplazos.map(({ clave, en }) => [clave, en]));
        if (dictionary.size !== config.reemplazos.length) {
            throw new Error('Duplicate translation keys in i18n/en.json.');
        }
    }

    if (requestId !== languageRequestId) return;

    applyLanguage(language, dictionary);
    savePreference('language', language);
}

const savedTheme = getPreference('theme') === 'dark';
updateTheme(savedTheme);

const savedLanguage = getPreference('language');
if (savedLanguage === 'en') {
    setLanguage('en').catch(error => {
        console.error('Could not load the English translation.', error);
        languageStatus.textContent = 'No se pudo cargar el inglés. Inténtalo de nuevo.';
    });
} else {
    applyLanguage('es');
}

scheduleAgeUpdate();

languageButtons.forEach(button => {
    button.addEventListener('click', () => {
        const language = button.dataset.language;
        if (language === document.documentElement.lang) return;

        setLanguage(language).catch(error => {
            console.error('Could not change the page language.', error);
            languageStatus.textContent = language === 'en'
                ? 'No se pudo cargar el inglés. Inténtalo de nuevo.'
                : 'Could not switch to Spanish. Please try again.';
        });
    });
});

themeButton.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark-mode');
    updateTheme(isDark);
    savePreference('theme', isDark ? 'dark' : 'light');
});
