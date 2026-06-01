const STORAGE_KEY = "local_exam_grading_app_v3_dynamic";
const SETTINGS_KEY = "local_exam_grading_settings_v3_dynamic";
const LEGACY_RECORDS_KEY = "local_exam_grading_app_v2";
const LEGACY_SETTINGS_KEY = "local_exam_grading_settings_v2";
const DEFAULT_GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const DEFAULT_SKILL_ID = "skill_reading";

const state = {
    data: {
        schools: [],
        records: {},
    },
    selectedSchoolId: "",
    selectedGrade: "",
    selectedClass: "",
    selectedSkillId: DEFAULT_SKILL_ID,
    selectedTestId: "",
    selectedSemester: "I",
    editingId: null,
    sortMode: "given",
    searchText: "",
    storageAvailable: true,
};

const collator = new Intl.Collator("vi-VN", {
    sensitivity: "base",
    ignorePunctuation: true,
    numeric: true,
});

const elements = {
    schoolSelect: document.getElementById("schoolSelect"),
    gradeSelect: document.getElementById("gradeSelect"),
    classSelect: document.getElementById("classSelect"),
    skillSelect: document.getElementById("skillSelect"),
    addSchoolBtn: document.getElementById("addSchoolBtn"),
    deleteSchoolBtn: document.getElementById("deleteSchoolBtn"),
    addClassBtn: document.getElementById("addClassBtn"),
    deleteClassBtn: document.getElementById("deleteClassBtn"),
    addGradeBtn: document.getElementById("addGradeBtn"),
    editGradeBtn: document.getElementById("editGradeBtn"),
    deleteGradeBtn: document.getElementById("deleteGradeBtn"),
    addSkillBtn: document.getElementById("addSkillBtn"),
    deleteSkillBtn: document.getElementById("deleteSkillBtn"),
    addPartBtn: document.getElementById("addPartBtn"),
    partsConfigList: document.getElementById("partsConfigList"),
    partScoreList: document.getElementById("partScoreList"),
    studentName: document.getElementById("studentName"),
    totalScore: document.getElementById("totalScore"),
    scoreForm: document.getElementById("scoreForm"),
    saveBtn: document.getElementById("saveBtn"),
    resetFormBtn: document.getElementById("resetFormBtn"),
    clearSkillBtn: document.getElementById("clearSkillBtn"),
    exportCurrentSkillBtn: document.getElementById("exportCurrentSkillBtn"),
    exportCurrentClassBtn: document.getElementById("exportCurrentClassBtn"),
    exportAllBtn: document.getElementById("exportAllBtn"),
    importExcelInput: document.getElementById("importExcelInput"),
    scoreTableHead: document.getElementById("scoreTableHead"),
    scoreTableBody: document.getElementById("scoreTableBody"),
    currentClassLabel: document.getElementById("currentClassLabel"),
    currentConfigLabel: document.getElementById("currentConfigLabel"),
    studentCount: document.getElementById("studentCount"),
    averageScore: document.getElementById("averageScore"),
    highestScore: document.getElementById("highestScore"),
    lowestScore: document.getElementById("lowestScore"),
    sortModeSelect: document.getElementById("sortModeSelect"),
    searchInput: document.getElementById("searchInput"),
    toast: document.getElementById("toast"),
    storageHint: document.getElementById("storageHint"),
    testSelect: document.getElementById("testSelect"),
    semesterSelect: document.getElementById("semesterSelect"),
    addTestBtn: document.getElementById("addTestBtn"),
    editTestBtn: document.getElementById("editTestBtn"),
    deleteTestBtn: document.getElementById("deleteTestBtn"),
    selectedTestMeta: document.getElementById("selectedTestMeta"),
    openRestoreCenterBtn: document.getElementById("openRestoreCenterBtn"),
    restoreModal: document.getElementById("restoreModal"),
    closeRestoreCenterBtn: document.getElementById("closeRestoreCenterBtn"),
    createManualBackupBtn: document.getElementById("createManualBackupBtn"),
    refreshRestoreCenterBtn: document.getElementById("refreshRestoreCenterBtn"),
    selectVisibleTrashBtn: document.getElementById("selectVisibleTrashBtn"),
    clearTrashSelectionBtn: document.getElementById("clearTrashSelectionBtn"),
    restoreSelectedTrashBtn: document.getElementById("restoreSelectedTrashBtn"),
    restoreSearchInput: document.getElementById("restoreSearchInput"),
    restoreTypeFilter: document.getElementById("restoreTypeFilter"),
    trashTableBody: document.getElementById("trashTableBody"),
    trashCountBadge: document.getElementById("trashCountBadge"),
    backupList: document.getElementById("backupList"),
    backupCountBadge: document.getElementById("backupCountBadge"),
    restoreDataInfo: document.getElementById("restoreDataInfo"),
};

const SEMESTER_LABELS = {
    I: "Học kỳ I",
    II: "Học kỳ II",
};

function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefaultSkill(name = "Reading") {
    const normalizedName = normalizeName(name) || "Reading";
    const safePrefix = removeVietnameseTones(normalizedName).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "skill";
    const isReading = normalizedName.toLowerCase() === "reading";

    return {
        id: isReading ? DEFAULT_SKILL_ID : createId(`skill_${safePrefix}`),
        name: normalizedName,
        parts: [
            { id: isReading ? "part_1" : createId("part"), label: "Part 1", maxQuestions: 8, maxPoints: 4 },
            { id: isReading ? "part_2" : createId("part"), label: "Part 2", maxQuestions: 6, maxPoints: 3 },
            { id: isReading ? "part_3" : createId("part"), label: "Part 3", maxQuestions: 6, maxPoints: 3 },
        ],
    };
}


function makeTest(name = "Bài kiểm tra 1") {
    return {
        id: createId("test"),
        name: normalizeName(name) || "Bài kiểm tra 1",
    };
}

function getTestLabel(test) {
    return test?.name || "";
}

function getSelectedSemester() {
    return SEMESTER_LABELS[state.selectedSemester] ? state.selectedSemester : "I";
}

function normalizeGradeInput(value) {
    const cleaned = removeVietnameseTones(String(value || ""))
        .toLowerCase()
        .replace(/khoi/g, "")
        .replace(/grade/g, "")
        .trim();
    const match = cleaned.match(/\d+/);
    return match ? String(Number(match[0])) : "";
}

function compareGrades(a, b) {
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
        return numA - numB;
    }
    return collator.compare(String(a), String(b));
}

function getGradeLabel(grade) {
    return grade ? `Khối ${grade}` : "Chưa có khối";
}

function parseGradeList(input) {
    const tokens = String(input || "").split(/[,;\s]+/);
    const seen = new Set();
    const grades = [];

    tokens.forEach((token) => {
        const grade = normalizeGradeInput(token);
        if (!grade || seen.has(grade)) return;
        seen.add(grade);
        grades.push(grade);
    });

    return grades.sort(compareGrades);
}

function makeGradesObject(grades) {
    return grades.reduce((acc, grade) => {
        acc[grade] = [];
        return acc;
    }, {});
}

function getSchoolGradeKeys(school) {
    if (!school || !school.grades || typeof school.grades !== "object") return [];
    return Object.keys(school.grades).sort(compareGrades);
}

function ensureSchoolGradeStructure(school) {
    if (!school.grades || typeof school.grades !== "object") {
        school.grades = {};
    }

    Object.keys(school.grades).forEach((grade) => {
        if (!Array.isArray(school.grades[grade])) {
            school.grades[grade] = [];
        }
    });

    if (!school.classConfigs || typeof school.classConfigs !== "object") {
        school.classConfigs = {};
    }
}


function makeDefaultData() {
    return {
        schools: [],
        records: {},
    };
}

function formatScore(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2300);
}

function normalizeName(name) {
    return String(name || "").replace(/\s+/g, " ").trim();
}

function removeVietnameseTones(text) {
    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}

function getSearchableText(value) {
    return removeVietnameseTones(normalizeName(value)).toLowerCase();
}

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeGetLocalStorage() {
    try {
        const testKey = "__grade_app_test__";
        localStorage.setItem(testKey, "1");
        localStorage.removeItem(testKey);
        return localStorage;
    } catch (error) {
        state.storageAvailable = false;
        return null;
    }
}

const storage = safeGetLocalStorage();

const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const LOCAL_SERVER_BASE = IS_LOCAL_HOST ? "" : "http://127.0.0.1:3000";
const SAVE_DEBOUNCE_MS = 450;
const DRAFT_DEBOUNCE_MS = 500;

let saveTimer = null;
let draftTimer = null;
let lastSaveStatus = "";
let restoreCenterTrashItems = [];
let restoreCenterBackups = [];

function getCurrentSettingsSnapshot() {
    return {
        selectedSchoolId: state.selectedSchoolId,
        selectedGrade: state.selectedGrade,
        selectedClass: state.selectedClass,
        selectedSkillId: state.selectedSkillId,
        selectedTestId: state.selectedTestId,
        selectedSemester: state.selectedSemester,
        sortMode: state.sortMode,
    };
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${LOCAL_SERVER_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `API error: ${response.status}`);
    }
    return payload;
}

async function saveStateNow(reason = "autosave") {
    try {
        const payload = {
            data: state.data,
            settings: getCurrentSettingsSnapshot(),
            reason,
        };
        const result = await apiRequest("/api/state", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        lastSaveStatus = result.savedAt || new Date().toISOString();
        updateStorageHint();
        return true;
    } catch (error) {
        console.error(error);
        if (storage) {
            storage.setItem(STORAGE_KEY, JSON.stringify(state.data));
            storage.setItem(SETTINGS_KEY, JSON.stringify(getCurrentSettingsSnapshot()));
        }
        state.storageAvailable = false;
        updateStorageHint("Không kết nối được Local JSON Server. Đang lưu tạm trong trình duyệt.");
        return false;
    }
}

function scheduleSaveState(reason = "autosave") {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveStateNow(reason), SAVE_DEBOUNCE_MS);
}

async function flushPendingSave(reason = "flush") {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    return saveStateNow(reason);
}

function updateStorageHint(extraMessage = "") {
    if (!elements.storageHint) return;
    if (extraMessage) {
        elements.storageHint.textContent = extraMessage;
        return;
    }
    if (state.storageAvailable) {
        const savedText = lastSaveStatus ? ` · Lưu lần cuối: ${formatDateTime(lastSaveStatus)}` : "";
        elements.storageHint.textContent = `Local JSON Server: dữ liệu dùng chung trong máy${savedText}`;
    } else {
        elements.storageHint.textContent = "Đang dùng localStorage tạm thời. Hãy chạy node script.js để lưu vào file local trên máy.";
    }
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function buildCurrentDraft() {
    return {
        context: getCurrentSettingsSnapshot(),
        editingId: state.editingId,
        studentName: elements.studentName?.value || "",
        answers: getCurrentFormAnswers(),
        totalText: elements.totalScore?.textContent || "0",
    };
}

async function saveDraftNow() {
    if (!state.storageAvailable) return;
    const draft = buildCurrentDraft();
    if (!draft.studentName && !Object.values(draft.answers || {}).some((value) => String(value || "").trim() !== "")) return;
    try {
        await apiRequest("/api/draft", {
            method: "POST",
            body: JSON.stringify({ draft }),
        });
    } catch (error) {
        console.warn("Cannot save draft", error.message);
    }
}

function scheduleDraftSave() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, DRAFT_DEBOUNCE_MS);
}

async function clearDraft() {
    clearTimeout(draftTimer);
    draftTimer = null;
    if (!state.storageAvailable) return;
    try {
        await apiRequest("/api/draft", { method: "DELETE" });
    } catch (error) {
        console.warn("Cannot clear draft", error.message);
    }
}

async function restoreDraftIfAvailable() {
    if (!state.storageAvailable) return;
    try {
        const result = await apiRequest("/api/draft");
        const draft = result.draft;
        if (!draft || !draft.studentName && !Object.values(draft.answers || {}).some((value) => String(value || "").trim() !== "")) return;
        const ok = window.confirm(
            `Phát hiện dữ liệu đang nhập chưa lưu (${formatDateTime(draft.savedAt)}).\nBạn có muốn khôi phục bản nháp này không?`
        );
        if (!ok) return;

        if (draft.context) {
            state.selectedSchoolId = draft.context.selectedSchoolId || state.selectedSchoolId;
            state.selectedGrade = draft.context.selectedGrade || state.selectedGrade;
            state.selectedClass = draft.context.selectedClass || state.selectedClass;
            state.selectedSkillId = draft.context.selectedSkillId || state.selectedSkillId;
            state.selectedTestId = draft.context.selectedTestId || state.selectedTestId;
            state.selectedSemester = draft.context.selectedSemester || state.selectedSemester;
            ensureValidSelection();
            renderAll();
        }
        state.editingId = draft.editingId || null;
        elements.studentName.value = draft.studentName || "";
        renderPartScoreInputs(draft.answers || {});
        elements.saveBtn.textContent = state.editingId ? "Cập nhật học sinh" : "Lưu học sinh";
        showToast("Đã khôi phục dữ liệu nháp.");
    } catch (error) {
        console.warn("Cannot load draft", error.message);
    }
}

function createTrashId(prefix = "trash") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getContextText(context = {}) {
    return [
        context.schoolName,
        context.grade ? getGradeLabel(context.grade) : "",
        context.className ? `Lớp ${context.className}` : "",
        context.skillName,
        context.semester ? (SEMESTER_LABELS[context.semester] || context.semester) : "",
        context.testName,
    ].filter(Boolean).join(" · ");
}

function buildRecordTrashItem(record, recordKey, reason = "Xóa điểm học sinh") {
    return {
        trashId: createTrashId("record"),
        entityType: "student-record",
        deletedAt: new Date().toISOString(),
        reason,
        context: {
            schoolId: record.schoolId,
            schoolName: record.schoolName,
            grade: record.grade,
            className: record.className,
            skillId: record.skillId,
            skillName: record.skillName,
            semester: record.semester,
            testId: record.testId,
            testName: record.testName,
            fullName: record.fullName,
            total: record.total,
        },
        payload: {
            recordKey,
            record: JSON.parse(JSON.stringify(record)),
        },
    };
}

function buildMetadataTrashItem(entityType, context, payload, reason) {
    return {
        trashId: createTrashId("meta"),
        entityType,
        deletedAt: new Date().toISOString(),
        reason,
        context,
        payload,
    };
}

async function addTrashItems(items) {
    if (!items.length || !state.storageAvailable) return;
    try {
        await apiRequest("/api/trash/add", {
            method: "POST",
            body: JSON.stringify({ items }),
        });
    } catch (error) {
        console.error(error);
        showToast("Không lưu được dữ liệu vào thùng rác. Hãy kiểm tra Local JSON Server.");
    }
}

function ensureRestoreSchool(context) {
    let school = state.data.schools.find((item) => item.id === context.schoolId);
    if (!school) {
        school = state.data.schools.find((item) => getSearchableText(item.name) === getSearchableText(context.schoolName));
    }
    if (!school) {
        school = {
            id: context.schoolId || createId("school"),
            name: context.schoolName || "Trường khôi phục",
            grades: {},
            classConfigs: {},
        };
        state.data.schools.push(school);
    }
    ensureSchoolGradeStructure(school);
    return school;
}

function restoreRecordTrashItem(item) {
    const record = item?.payload?.record;
    const context = item?.context || {};
    if (!record) return false;

    const school = ensureRestoreSchool(context);
    const grade = context.grade || record.grade || "6";
    const className = context.className || record.className || `${grade}A`;
    if (!school.grades[grade]) school.grades[grade] = [];
    if (!school.grades[grade].some((name) => getSearchableText(name) === getSearchableText(className))) {
        school.grades[grade].push(className);
        school.grades[grade].sort((a, b) => collator.compare(a, b));
    }

    const config = ensureClassConfigForSchool(school, grade, className);
    let skill = config.skills.find((item) => item.id === record.skillId);
    if (!skill) skill = config.skills.find((item) => getSearchableText(item.name) === getSearchableText(record.skillName));
    if (!skill) {
        skill = {
            id: record.skillId || createId("skill_restore"),
            name: record.skillName || "Restored Skill",
            parts: [],
        };
        Object.keys(record.scores || record.answers || {}).forEach((partId, index) => {
            skill.parts.push({ id: partId, label: `Part ${index + 1}`, maxQuestions: 1, maxPoints: Number(record.scores?.[partId] || 1) || 1 });
        });
        if (!skill.parts.length) skill.parts = makeDefaultSkill(skill.name).parts;
        config.skills.push(skill);
    }

    let test = config.tests.find((item) => item.id === record.testId);
    if (!test) test = config.tests.find((item) => getSearchableText(item.name) === getSearchableText(record.testName));
    if (!test) {
        test = { id: record.testId || createId("test"), name: record.testName || "Bài khôi phục" };
        config.tests.push(test);
        config.tests.sort((a, b) => collator.compare(a.name, b.name));
    }

    const restoredRecord = {
        ...record,
        schoolId: school.id,
        schoolName: school.name,
        grade,
        className,
        skillId: skill.id,
        skillName: skill.name,
        testId: test.id,
        testName: test.name,
        restoredAt: new Date().toISOString(),
    };

    const classKey = getClassKey(school.id, grade, className);
    const recordKey = getRecordKey(classKey, skill.id);
    if (!Array.isArray(state.data.records[recordKey])) state.data.records[recordKey] = [];
    const bucket = state.data.records[recordKey];
    const duplicateIndex = bucket.findIndex((existing) =>
        getSearchableText(existing.fullName) === getSearchableText(restoredRecord.fullName) &&
        String(existing.semester || "I") === String(restoredRecord.semester || "I") &&
        (existing.testId === restoredRecord.testId || getSearchableText(existing.testName) === getSearchableText(restoredRecord.testName))
    );

    if (duplicateIndex !== -1) bucket[duplicateIndex] = { ...bucket[duplicateIndex], ...restoredRecord };
    else bucket.push(restoredRecord);

    state.selectedSchoolId = school.id;
    state.selectedGrade = grade;
    state.selectedClass = className;
    state.selectedSkillId = skill.id;
    state.selectedTestId = test.id;
    state.selectedSemester = restoredRecord.semester || "I";
    return true;
}

function restoreMetadataTrashItem(item) {
    const payload = item?.payload || {};
    const context = item?.context || {};
    if (item.entityType === "class-metadata") {
        const school = ensureRestoreSchool(context);
        const grade = context.grade || payload.grade || "6";
        const className = context.className || payload.className || `${grade}A`;
        if (!school.grades[grade]) school.grades[grade] = [];
        if (!school.grades[grade].includes(className)) school.grades[grade].push(className);
        ensureClassConfigForSchool(school, grade, className);
        return true;
    }
    if (item.entityType === "test-metadata") {
        const school = ensureRestoreSchool(context);
        const grade = context.grade || "6";
        const className = context.className || `${grade}A`;
        if (!school.grades[grade]) school.grades[grade] = [];
        if (!school.grades[grade].includes(className)) school.grades[grade].push(className);
        const config = ensureClassConfigForSchool(school, grade, className);
        const test = payload.test || { id: context.testId || createId("test"), name: context.testName || "Bài khôi phục" };
        if (!config.tests.some((item) => item.id === test.id || getSearchableText(item.name) === getSearchableText(test.name))) {
            config.tests.push(test);
            config.tests.sort((a, b) => collator.compare(a.name, b.name));
        }
        return true;
    }
    return false;
}


function getClassKey(schoolId, grade, className) {
    return `${schoolId}::${grade}::${className}`;
}

function getRecordKey(classKey, skillId) {
    return `${classKey}::${skillId}`;
}

function getSelectedSchool() {
    return state.data.schools.find((school) => school.id === state.selectedSchoolId) || null;
}

function getSelectedClassKey() {
    if (!state.selectedSchoolId || !state.selectedGrade || !state.selectedClass) return "";
    return getClassKey(state.selectedSchoolId, state.selectedGrade, state.selectedClass);
}

function getSelectedRecordKey() {
    const classKey = getSelectedClassKey();
    if (!classKey || !state.selectedSkillId) return "";
    return getRecordKey(classKey, state.selectedSkillId);
}

function ensureClassConfigForSchool(school, grade, className) {
    if (!school.classConfigs || typeof school.classConfigs !== "object") {
        school.classConfigs = {};
    }

    const classKey = getClassKey(school.id, grade, className);
    if (!school.classConfigs[classKey]) {
        school.classConfigs[classKey] = {
            skills: [makeDefaultSkill("Reading")],
            tests: [],
        };
    }

    const config = school.classConfigs[classKey];
    if (!Array.isArray(config.tests)) {
        config.tests = [];
    }

    if (!Array.isArray(config.skills) || !config.skills.length) {
        config.skills = [makeDefaultSkill("Reading")];
    }

    config.skills.forEach((skill) => {
        if (!Array.isArray(skill.parts) || !skill.parts.length) {
            skill.parts = makeDefaultSkill(skill.name || "Reading").parts;
        }
    });

    return config;
}

function getSelectedClassConfig() {
    const school = getSelectedSchool();
    if (!school || !state.selectedGrade || !state.selectedClass) return null;
    return ensureClassConfigForSchool(school, state.selectedGrade, state.selectedClass);
}

function getSelectedSkill() {
    const config = getSelectedClassConfig();
    if (!config) return null;
    return config.skills.find((skill) => skill.id === state.selectedSkillId) || config.skills[0] || null;
}

function getSelectedTest() {
    const config = getSelectedClassConfig();
    if (!config) return null;
    return config.tests.find((test) => test.id === state.selectedTestId) || config.tests[0] || null;
}

function findTestByRecord(record) {
    const config = getSelectedClassConfig();
    if (!config) return null;

    if (record?.testId) {
        const byId = config.tests.find((test) => test.id === record.testId);
        if (byId) return byId;
    }

    return (
        config.tests.find((test) => getSearchableText(test.name) === getSearchableText(record?.testName || "")) ||
        null
    );
}

function recordBelongsToTest(record, test, semester = getSelectedSemester()) {
    if (!test) return false;

    const sameTest =
        record?.testId === test.id ||
        getSearchableText(record?.testName || "") === getSearchableText(test.name || "");
    const sameSemester = String(record?.semester || "I") === String(semester || "I");

    return sameTest && sameSemester;
}

function recordBelongsToTestAnySemester(record, test) {
    if (!test) return false;
    return (
        record?.testId === test.id ||
        getSearchableText(record?.testName || "") === getSearchableText(test.name || "")
    );
}

function ensureValidSelection() {
    if (!Array.isArray(state.data.schools)) {
        state.data.schools = [];
    }

    if (!state.data.schools.length) {
        state.selectedSchoolId = "";
        state.selectedGrade = "";
        state.selectedClass = "";
        state.selectedSkillId = "";
        state.selectedTestId = "";
        state.selectedSemester = "I";
        return;
    }

    if (!state.data.schools.some((school) => school.id === state.selectedSchoolId)) {
        state.selectedSchoolId = state.data.schools[0].id;
    }

    const school = getSelectedSchool();
    if (!school) return;

    ensureSchoolGradeStructure(school);
    const gradeKeys = getSchoolGradeKeys(school);

    if (!gradeKeys.length) {
        state.selectedGrade = "";
        state.selectedClass = "";
        state.selectedSkillId = "";
        state.selectedTestId = "";
        state.selectedSemester = "I";
        return;
    }

    if (!gradeKeys.includes(state.selectedGrade)) {
        state.selectedGrade = gradeKeys[0];
    }

    const classList = school.grades[state.selectedGrade] || [];
    if (!classList.includes(state.selectedClass)) {
        state.selectedClass = classList[0] || "";
    }

    if (!state.selectedClass) {
        state.selectedSkillId = "";
        state.selectedTestId = "";
        state.selectedSemester = "I";
        return;
    }

    const config = ensureClassConfigForSchool(school, state.selectedGrade, state.selectedClass);
    if (!config.skills.some((skill) => skill.id === state.selectedSkillId)) {
        state.selectedSkillId = config.skills[0]?.id || "";
    }
    if (!SEMESTER_LABELS[state.selectedSemester]) {
        state.selectedSemester = "I";
    }

    if (!config.tests.some((test) => test.id === state.selectedTestId)) {
        state.selectedTestId = config.tests[0]?.id || "";
    }
}

function migrateLegacyData() {
    if (!storage) return null;

    try {
        const legacyRecords = JSON.parse(storage.getItem(LEGACY_RECORDS_KEY) || "null");
        const legacySettings = JSON.parse(storage.getItem(LEGACY_SETTINGS_KEY) || "{}");
        if (!legacyRecords || typeof legacyRecords !== "object") return null;

        const data = makeDefaultData();
        const school = data.schools[0];

        Object.entries(legacyRecords).forEach(([className, records]) => {
            if (!Array.isArray(records)) return;
            const grade = String(className).match(/^\d+/)?.[0] || "6";
            if (!DEFAULT_GRADES.includes(grade)) return;

            if (!school.grades[grade].includes(className)) {
                school.grades[grade].push(className);
            }

            const config = ensureClassConfigForSchool(school, grade, className);
            const skill = config.skills[0];
            const classKey = getClassKey(school.id, grade, className);
            const recordKey = getRecordKey(classKey, skill.id);

            data.records[recordKey] = records.map((item) => {
                const answers = {
                    part_1: clampInteger(item.part1Correct, 0, 8),
                    part_2: clampInteger(item.part2Correct, 0, 6),
                    part_3: clampInteger(item.part3Correct, 0, 6),
                };
                const computed = computeScoresFromAnswers(answers, skill);

                return {
                    id: item.id || createId("student"),
                    fullName: normalizeName(item.fullName),
                    schoolId: school.id,
                    schoolName: school.name,
                    grade,
                    className,
                    skillId: skill.id,
                    skillName: skill.name,
                    answers,
                    scores: computed.scores,
                    total: computed.total,
                    updatedAt: item.updatedAt || new Date().toISOString(),
                };
            });
        });

        state.data = data;
        state.selectedSchoolId = school.id;
        state.selectedGrade = legacySettings.selectedGrade || "6";
        state.selectedClass = legacySettings.selectedClass || "";
        state.selectedSkillId = DEFAULT_SKILL_ID;
        state.selectedTestId = "";
        state.selectedSemester = "I";
        state.sortMode = legacySettings.sortMode || "given";
        ensureValidSelection();
        return true;
    } catch (error) {
        return null;
    }
}


function ensureTestsFromRecords() {
    state.data.schools.forEach((school) => {
        Object.entries(school.grades || {}).forEach(([grade, classes]) => {
            (classes || []).forEach((className) => {
                const config = ensureClassConfigForSchool(school, grade, className);
                const classKey = getClassKey(school.id, grade, className);

                // Merge old test objects that only differ by semester into one test option by name.
                const mergedTests = [];
                (config.tests || []).forEach((test) => {
                    const name = normalizeName(test.name || "Bài kiểm tra 1");
                    if (!mergedTests.some((item) => getSearchableText(item.name) === getSearchableText(name))) {
                        mergedTests.push({ id: test.id || createId("test"), name });
                    }
                });
                config.tests = mergedTests;

                config.skills.forEach((skill) => {
                    const recordKey = getRecordKey(classKey, skill.id);
                    const records = Array.isArray(state.data.records[recordKey]) ? state.data.records[recordKey] : [];

                    records.forEach((record) => {
                        const name = normalizeName(record.testName || "Bài kiểm tra 1");
                        const semester = SEMESTER_LABELS[record.semester] ? record.semester : "I";

                        let test = record.testId ? config.tests.find((item) => item.id === record.testId) : null;

                        if (!test) {
                            test = config.tests.find((item) => getSearchableText(item.name) === getSearchableText(name));
                        }

                        if (!test) {
                            test = makeTest(name);
                            config.tests.push(test);
                        }

                        record.testId = test.id;
                        record.testName = test.name;
                        record.semester = semester;
                    });
                });

                config.tests.sort((a, b) => collator.compare(a.name, b.name));
            });
        });
    });
}

async function loadState() {
    try {
        const result = await apiRequest("/api/state");
        state.storageAvailable = true;
        state.data = result.data && typeof result.data === "object" ? result.data : makeDefaultData();
        const settings = result.settings || {};
        state.selectedSchoolId = settings.selectedSchoolId || "";
        state.selectedGrade = settings.selectedGrade || "6";
        state.selectedClass = settings.selectedClass || "";
        state.selectedSkillId = settings.selectedSkillId || "";
        state.selectedTestId = settings.selectedTestId || "";
        state.selectedSemester = settings.selectedSemester || "I";
        state.sortMode = settings.sortMode || "given";

        if (!state.data.schools || !Array.isArray(state.data.schools)) {
            state.data = makeDefaultData();
        }
    } catch (error) {
        console.warn("Local JSON Server unavailable, using browser fallback:", error.message);
        state.storageAvailable = false;
        try {
            const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
            const settings = JSON.parse(storage?.getItem(SETTINGS_KEY) || "{}");
            if (saved && Array.isArray(saved.schools) && saved.schools.length) {
                state.data = {
                    schools: saved.schools,
                    records: saved.records && typeof saved.records === "object" ? saved.records : {},
                };
                state.selectedSchoolId = settings.selectedSchoolId || "";
                state.selectedGrade = settings.selectedGrade || "6";
                state.selectedClass = settings.selectedClass || "";
                state.selectedSkillId = settings.selectedSkillId || "";
                state.selectedTestId = settings.selectedTestId || "";
                state.selectedSemester = settings.selectedSemester || "I";
                state.sortMode = settings.sortMode || "given";
            } else {
                state.data = makeDefaultData();
            }
        } catch {
            state.data = makeDefaultData();
        }
    }

    ensureTestsFromRecords();
    ensureValidSelection();
}

function saveState() {
    scheduleSaveState("app data change");
}

function clampInteger(value, min, max) {
    if (value === "" || value === null || value === undefined) return 0;
    const num = Math.floor(Number(value));
    if (Number.isNaN(num)) return 0;
    return Math.min(max, Math.max(min, num));
}

function clampPositiveInteger(value, fallback = 1) {
    if (value === "" || value === null || value === undefined) return fallback;
    const num = Math.floor(Number(value));
    if (!Number.isFinite(num) || num < 1) return fallback;
    return num;
}

function clampPositiveNumber(value, fallback = 1) {
    if (value === "" || value === null || value === undefined) return fallback;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return Number(num.toFixed(2));
}

function calcPartScore(correct, maxQuestions, maxPoints) {
    const safeQuestions = Math.max(1, Number(maxQuestions || 1));
    const safePoints = Math.max(0, Number(maxPoints || 0));
    const safeCorrect = clampInteger(correct, 0, safeQuestions);
    return (safeCorrect / safeQuestions) * safePoints;
}

function computeScoresFromAnswers(answers, skill) {
    const scores = {};
    let total = 0;

    (skill?.parts || []).forEach((part) => {
        const correct = clampInteger(answers?.[part.id], 0, part.maxQuestions);
        const score = calcPartScore(correct, part.maxQuestions, part.maxPoints);
        scores[part.id] = Number(score.toFixed(2));
        total += score;
    });

    return {
        scores,
        total: Number(total.toFixed(2)),
    };
}

function getNamePieces(fullName) {
    const normalized = normalizeName(fullName);
    const parts = normalized.split(" ").filter(Boolean);
    if (!parts.length) {
        return { full: "", surname: "", middle: "", given: "" };
    }

    return {
        full: normalized,
        surname: parts[0] || "",
        middle: parts.slice(1, -1).join(" "),
        given: parts[parts.length - 1] || "",
    };
}

function compareStudentsFactory(mode) {
    return (a, b) => {
        const aName = getNamePieces(a.fullName);
        const bName = getNamePieces(b.fullName);

        if (mode === "full") {
            return collator.compare(aName.full, bName.full);
        }

        return (
            collator.compare(aName.given, bName.given) ||
            collator.compare(aName.middle, bName.middle) ||
            collator.compare(aName.surname, bName.surname) ||
            collator.compare(aName.full, bName.full)
        );
    };
}

function getCurrentComparator() {
    return compareStudentsFactory(state.sortMode);
}

function getCurrentRecordsRaw() {
    const recordKey = getSelectedRecordKey();
    if (!recordKey) return [];
    if (!Array.isArray(state.data.records[recordKey])) {
        state.data.records[recordKey] = [];
    }
    return state.data.records[recordKey];
}

function getCurrentRecords() {
    const skill = getSelectedSkill();
    const test = getSelectedTest();
    const records = getCurrentRecordsRaw()
        .map((record) => recalculateRecord(record, skill))
        .filter((record) => recordBelongsToTest(record, test));
    const keyword = getSearchableText(state.searchText);
    const filtered = keyword
        ? records.filter((item) => getSearchableText(item.fullName).includes(keyword))
        : records;

    return [...filtered].sort(getCurrentComparator());
}

function recordUsesManualScores(record) {
    return record?.scoreMode === "manual" && record.scores && typeof record.scores === "object";
}

function recalculateRecord(record, skill) {
    if (recordUsesManualScores(record)) {
        const partScores = {};
        let manualTotal = 0;
        let hasPartScore = false;

        (skill?.parts || []).forEach((part) => {
            const score = Number(record.scores?.[part.id] || 0);
            const safeScore = Number.isFinite(score) ? Number(score.toFixed(2)) : 0;
            partScores[part.id] = safeScore;
            manualTotal += safeScore;
            if (safeScore !== 0) hasPartScore = true;
        });

        record.scores = partScores;
        record.total = Number((hasPartScore ? manualTotal : Number(record.total || 0)).toFixed(2));
        record.skillName = skill?.name || record.skillName || "";
        return record;
    }

    const computed = computeScoresFromAnswers(record.answers || {}, skill);
    record.scores = computed.scores;
    record.total = computed.total;
    record.skillName = skill?.name || record.skillName || "";
    return record;
}

function getRecordAnswersForForm(record) {
    if (!recordUsesManualScores(record)) return record.answers || {};

    const skill = getSelectedSkill();
    const answers = { ...(record.answers || {}) };

    (skill?.parts || []).forEach((part) => {
        if (answers[part.id] !== undefined && answers[part.id] !== null && answers[part.id] !== "") return;

        const score = Number(record.scores?.[part.id]);
        const maxPoints = Number(part.maxPoints || 0);
        const maxQuestions = Math.max(1, Number(part.maxQuestions || 1));

        if (!Number.isFinite(score) || maxPoints <= 0) {
            answers[part.id] = 0;
            return;
        }

        answers[part.id] = clampInteger(Math.round((score / maxPoints) * maxQuestions), 0, maxQuestions);
    });

    return answers;
}

function recalculateCurrentSkillRecords() {
    const skill = getSelectedSkill();
    if (!skill) return;
    getCurrentRecordsRaw().forEach((record) => recalculateRecord(record, skill));
}

function renderSelectors() {
    ensureValidSelection();
    const selectedSchool = getSelectedSchool();

    elements.schoolSelect.innerHTML = state.data.schools.length
        ? state.data.schools
            .map((school) => `<option value="${escapeHtml(school.id)}">${escapeHtml(school.name)}</option>`)
            .join("")
        : '<option value="">Nhập tên trường</option>';
    elements.schoolSelect.value = state.selectedSchoolId;
    elements.schoolSelect.disabled = !state.data.schools.length;

    const gradeKeys = getSchoolGradeKeys(selectedSchool);
    elements.gradeSelect.innerHTML = gradeKeys.length
        ? gradeKeys.map((grade) => `<option value="${escapeHtml(grade)}">${escapeHtml(getGradeLabel(grade))}</option>`).join("")
        : '<option value="">Chưa có khối</option>';
    elements.gradeSelect.disabled = !selectedSchool || !gradeKeys.length;
    elements.gradeSelect.value = state.selectedGrade;

    const classes = selectedSchool?.grades?.[state.selectedGrade] || [];
    elements.classSelect.disabled = !selectedSchool || !state.selectedGrade || !classes.length;
    elements.classSelect.innerHTML = classes.length
        ? classes.map((className) => `<option value="${escapeHtml(className)}">${escapeHtml(className)}</option>`).join("")
        : '<option value="">Chưa có lớp</option>';
    elements.classSelect.value = state.selectedClass;

    const config = getSelectedClassConfig();
    const skills = config?.skills || [];
    elements.skillSelect.disabled = !state.selectedClass || !skills.length;
    elements.skillSelect.innerHTML = skills.length
        ? skills.map((skill) => `<option value="${escapeHtml(skill.id)}">${escapeHtml(skill.name)}</option>`).join("")
        : '<option value="">Chưa có kỹ năng</option>';
    elements.skillSelect.value = state.selectedSkillId;

    elements.semesterSelect.disabled = !state.selectedClass;
    elements.semesterSelect.value = getSelectedSemester();

    const tests = config?.tests || [];
    elements.testSelect.disabled = !state.selectedClass || !tests.length;
    elements.testSelect.innerHTML = tests.length
        ? tests.map((test) => `<option value="${escapeHtml(test.id)}">${escapeHtml(test.name)}</option>`).join("")
        : '<option value="">Chưa có bài làm</option>';
    elements.testSelect.value = state.selectedTestId;
    renderSelectedTestMeta();
}

function renderSelectedTestMeta() {
    const test = getSelectedTest();
    if (!elements.selectedTestMeta) return;

    if (!test) {
        elements.selectedTestMeta.textContent = "Chưa có bài làm. Hãy bấm + Bài để tạo bài làm trước khi nhập điểm.";
        return;
    }

    elements.selectedTestMeta.textContent = `Đang chấm: ${SEMESTER_LABELS[getSelectedSemester()]} · ${test.name}`;
}

function getCurrentFormAnswers() {
    const answers = {};
    elements.partScoreList.querySelectorAll("input[data-score-part-id]").forEach((input) => {
        answers[input.dataset.scorePartId] = input.value;
    });
    return answers;
}

function renderPartScoreInputs(presetAnswers = null) {
    const skill = getSelectedSkill();
    const parts = skill?.parts || [];
    const answers = presetAnswers || getCurrentFormAnswers();

    if (!state.selectedClass || !skill || !parts.length) {
        elements.partScoreList.innerHTML = `
      <div class="empty-state">Hãy chọn lớp và tạo ít nhất 1 part để nhập điểm.</div>
    `;
        elements.totalScore.textContent = "0";
        return;
    }

    elements.partScoreList.innerHTML = parts
        .map((part) => {
            const value = answers?.[part.id] ?? "";
            return `
        <div class="part-score-card">
          <div class="part-meta">
            <h3>${escapeHtml(part.label)}</h3>
            <p>${formatScore(part.maxPoints)} điểm · ${part.maxQuestions} câu</p>
          </div>
          <label class="field inline-field">
            <span>Số câu đúng</span>
            <input
              type="number"
              min="0"
              max="${part.maxQuestions}"
              step="1"
              inputmode="numeric"
              placeholder="0 - ${part.maxQuestions}"
              value="${escapeHtml(value)}"
              data-score-part-id="${escapeHtml(part.id)}"
            />
          </label>
          <div class="score-box">
            <span>Điểm</span>
            <strong data-score-output-id="${escapeHtml(part.id)}">0</strong>
          </div>
        </div>
      `;
        })
        .join("");

    updateComputedScores();
}

function renderPartConfig() {
    const skill = getSelectedSkill();
    const school = getSelectedSchool();

    if (!school || !state.selectedClass || !skill) {
        elements.currentConfigLabel.textContent = "Chưa chọn lớp";
        elements.partsConfigList.innerHTML = '<div class="empty-state">Chọn trường, lớp và kỹ năng để chỉnh part.</div>';
        return;
    }

    elements.currentConfigLabel.textContent = `${school.name} · Khối ${state.selectedGrade} · Lớp ${state.selectedClass} · ${skill.name}`;

    elements.partsConfigList.innerHTML = skill.parts
        .map(
            (part) => `
        <div class="part-config-row" data-config-part-id="${escapeHtml(part.id)}">
          <label class="field">
            <span>Tên part</span>
            <input type="text" value="${escapeHtml(part.label)}" data-part-field="label" maxlength="40" />
          </label>
          <label class="field">
            <span>Số câu</span>
            <input type="number" min="1" step="1" value="${part.maxQuestions}" data-part-field="maxQuestions" />
          </label>
          <label class="field">
            <span>Số điểm</span>
            <input type="number" min="0.25" step="0.25" value="${part.maxPoints}" data-part-field="maxPoints" />
          </label>
          <button type="button" class="icon-btn danger" data-action="delete-part" data-id="${escapeHtml(part.id)}">Xóa</button>
        </div>
      `
        )
        .join("");
}

function updateComputedScores() {
    const skill = getSelectedSkill();
    if (!skill) {
        elements.totalScore.textContent = "0";
        return { answers: {}, scores: {}, total: 0 };
    }

    const answers = {};
    const scores = {};
    let total = 0;

    skill.parts.forEach((part) => {
        const input = elements.partScoreList.querySelector(`input[data-score-part-id="${CSS.escape(part.id)}"]`);
        const output = elements.partScoreList.querySelector(`[data-score-output-id="${CSS.escape(part.id)}"]`);
        const correct = clampInteger(input?.value, 0, part.maxQuestions);
        const score = calcPartScore(correct, part.maxQuestions, part.maxPoints);

        answers[part.id] = correct;
        scores[part.id] = Number(score.toFixed(2));
        total += score;

        if (output) output.textContent = formatScore(score);
    });

    const finalTotal = Number(total.toFixed(2));
    elements.totalScore.textContent = formatScore(finalTotal);
    return { answers, scores, total: finalTotal };
}

function resetForm(keepFocus = true) {
    state.editingId = null;
    elements.studentName.value = "";
    clearDraft();
    renderPartScoreInputs({});
    elements.saveBtn.textContent = "Lưu học sinh";

    if (keepFocus && !elements.studentName.disabled) {
        elements.studentName.focus();
    }
}

function renderLabels() {
    const school = getSelectedSchool();
    const skill = getSelectedSkill();
    const test = getSelectedTest();

    if (!school || !state.selectedClass || !skill) {
        elements.currentClassLabel.textContent = "Chưa chọn lớp hoặc kỹ năng";
        return;
    }

    const testLabel = test ? ` · ${SEMESTER_LABELS[getSelectedSemester()]} · ${test.name}` : " · Chưa chọn bài làm";
    elements.currentClassLabel.textContent = `Đang chấm: ${school.name} · Khối ${state.selectedGrade} · Lớp ${state.selectedClass} · ${skill.name}${testLabel}`;
}

function renderStats(records) {
    const count = records.length;
    const totals = records.map((item) => Number(item.total || 0));
    const sum = totals.reduce((acc, cur) => acc + cur, 0);

    elements.studentCount.textContent = String(count);
    elements.averageScore.textContent = count ? formatScore(sum / count) : "0";
    elements.highestScore.textContent = count ? formatScore(Math.max(...totals)) : "0";
    elements.lowestScore.textContent = count ? formatScore(Math.min(...totals)) : "0";
}

function renderTableHead(skill) {
    const parts = skill?.parts || [];
    const partHeaders = parts
        .map(
            (part) => `
        <th class="numeric">${escapeHtml(part.label)} đúng</th>
        <th class="numeric">Điểm ${escapeHtml(part.label)}</th>
      `
        )
        .join("");

    elements.scoreTableHead.innerHTML = `
    <tr>
      <th class="numeric">STT</th>
      <th>Họ và tên</th>
      ${partHeaders}
      <th class="numeric">Tổng</th>
      <th class="numeric">Thao tác</th>
    </tr>
  `;
}

function renderTable() {
    const skill = getSelectedSkill();
    renderLabels();
    renderTableHead(skill);

    const colSpan = 4 + (skill?.parts?.length || 0) * 2;

    if (!state.selectedClass || !skill) {
        elements.scoreTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Chọn trường, lớp và kỹ năng để bắt đầu chấm điểm.</td></tr>`;
        renderStats([]);
        return;
    }

    if (!getSelectedTest()) {
        elements.scoreTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Hãy tạo và chọn một bài làm trước khi nhập điểm.</td></tr>`;
        renderStats([]);
        return;
    }

    const records = getCurrentRecords();
    renderStats(records);

    if (!records.length) {
        elements.scoreTableBody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-state">Chưa có dữ liệu cho bài làm đang chọn.</td></tr>`;
        return;
    }

    elements.scoreTableBody.innerHTML = records
        .map((item, index) => {
            const partCells = skill.parts
                .map((part) => {
                    const rawAnswer = item.answers?.[part.id];
                    const hasAnswer = rawAnswer !== undefined && rawAnswer !== null && rawAnswer !== "";
                    const correct = recordUsesManualScores(item) && !hasAnswer
                        ? "—"
                        : clampInteger(rawAnswer, 0, part.maxQuestions);
                    const score = item.scores?.[part.id] ?? 0;
                    return `
            <td class="numeric">${correct}</td>
            <td class="numeric">${formatScore(score)}</td>
          `;
                })
                .join("");

            return `
        <tr>
          <td class="numeric">${index + 1}</td>
          <td>${escapeHtml(item.fullName)}</td>
          ${partCells}
          <td class="numeric"><span class="total-pill">${formatScore(item.total)}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit" data-id="${escapeHtml(item.id)}">Sửa</button>
              <button class="icon-btn danger" data-action="delete" data-id="${escapeHtml(item.id)}">Xóa</button>
            </div>
          </td>
        </tr>
      `;
        })
        .join("");
}

function renderAll(options = {}) {
    const keepForm = Boolean(options.keepForm);
    const currentAnswers = keepForm ? getCurrentFormAnswers() : null;
    renderSelectors();
    renderPartConfig();
    renderPartScoreInputs(keepForm ? currentAnswers : {});
    renderTable();
    elements.sortModeSelect.value = state.sortMode;
    elements.searchInput.value = state.searchText;
}

function validateForm() {
    const school = getSelectedSchool();
    const skill = getSelectedSkill();

    if (!school) {
        showToast("Vui lòng tạo hoặc chọn trường.");
        elements.schoolSelect.focus();
        return false;
    }

    if (!state.selectedClass) {
        showToast("Vui lòng chọn hoặc thêm lớp.");
        elements.classSelect.focus();
        return false;
    }

    if (!skill) {
        showToast("Vui lòng tạo hoặc chọn kỹ năng.");
        elements.skillSelect.focus();
        return false;
    }

    const fullName = normalizeName(elements.studentName.value);
    if (!fullName) {
        showToast("Vui lòng nhập họ tên học sinh.");
        elements.studentName.focus();
        return false;
    }

    const test = getSelectedTest();
    if (!test) {
        showToast("Vui lòng tạo hoặc chọn bài làm trước khi nhập điểm.");
        elements.testSelect?.focus();
        return false;
    }

    skill.parts.forEach((part) => {
        const input = elements.partScoreList.querySelector(`input[data-score-part-id="${CSS.escape(part.id)}"]`);
        if (!input) return;
        input.value = clampInteger(input.value, 0, part.maxQuestions);
    });

    updateComputedScores();
    return true;
}

function makeRecord() {
    const school = getSelectedSchool();
    const skill = getSelectedSkill();
    const test = getSelectedTest();
    const computed = updateComputedScores();

    return {
        id: state.editingId || createId("student"),
        fullName: normalizeName(elements.studentName.value),
        schoolId: school.id,
        schoolName: school.name,
        grade: state.selectedGrade,
        className: state.selectedClass,
        skillId: skill.id,
        skillName: skill.name,
        testId: test.id,
        testName: test.name,
        semester: getSelectedSemester(),
        answers: computed.answers,
        scores: computed.scores,
        total: computed.total,
        updatedAt: new Date().toISOString(),
    };
}

function upsertRecord(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const recordKey = getSelectedRecordKey();
    if (!recordKey) return;

    if (!Array.isArray(state.data.records[recordKey])) {
        state.data.records[recordKey] = [];
    }

    const record = makeRecord();
    const bucket = state.data.records[recordKey];
    const wasEditing = Boolean(state.editingId);

    const duplicateIndex = bucket.findIndex(
        (item) =>
            getSearchableText(item.fullName) === getSearchableText(record.fullName) &&
            recordBelongsToTest(item, getSelectedTest()) &&
            item.id !== record.id
    );

    if (duplicateIndex !== -1) {
        const shouldReplace = window.confirm(
            `Học sinh "${record.fullName}" đã có bài "${record.testName}" (${SEMESTER_LABELS[record.semester] || record.semester}) trong lớp ${state.selectedClass}, kỹ năng ${record.skillName}. Bạn có muốn ghi đè điểm cũ không?`
        );
        if (!shouldReplace) return;
        bucket[duplicateIndex] = { ...bucket[duplicateIndex], ...record };
    } else {
        const editingIndex = bucket.findIndex((item) => item.id === record.id);
        if (editingIndex !== -1) {
            bucket[editingIndex] = record;
        } else {
            bucket.push(record);
        }
    }

    saveState();
    renderTable();
    resetForm(true);
    clearDraft();
    showToast(wasEditing ? "Đã cập nhật điểm học sinh." : "Đã lưu điểm học sinh.");
}

function editRecord(id) {
    const bucket = getCurrentRecordsRaw();
    const record = bucket.find((item) => item.id === id);
    if (!record) return;

    state.editingId = record.id;
    elements.studentName.value = record.fullName;
    const recordTest = findTestByRecord(record);
    if (recordTest) {
        state.selectedTestId = recordTest.id;
        state.selectedSemester = SEMESTER_LABELS[record.semester] ? record.semester : "I";
        renderSelectors();
    }
    renderPartScoreInputs(getRecordAnswersForForm(record));
    elements.saveBtn.textContent = "Cập nhật học sinh";
    elements.studentName.focus();

    if (recordUsesManualScores(record)) {
        showToast("Dòng nhập từ Excel chỉ có điểm. Hãy kiểm tra số câu đúng trước khi cập nhật.");
    } else {
        showToast(`Đang sửa: ${record.fullName}`);
    }
}

function deleteRecord(id) {
    const recordKey = getSelectedRecordKey();
    const bucket = getCurrentRecordsRaw();
    const record = bucket.find((item) => item.id === id);
    if (!record || !recordKey) return;

    const ok = window.confirm(`Xóa học sinh "${record.fullName}" khỏi kỹ năng đang chọn?`);
    if (!ok) return;

    addTrashItems([buildRecordTrashItem(record, recordKey, "Xóa 1 dòng điểm học sinh")]);
    state.data.records[recordKey] = bucket.filter((item) => item.id !== id);
    saveState();
    renderTable();
    if (state.editingId === id) {
        resetForm();
    }
    showToast("Đã xóa học sinh.");
}

function clearCurrentSkill() {
    const recordKey = getSelectedRecordKey();
    const skill = getSelectedSkill();
    if (!recordKey || !skill) {
        showToast("Hãy chọn kỹ năng trước khi xóa dữ liệu.");
        return;
    }

    const count = (state.data.records[recordKey] || []).length;
    if (!count) {
        showToast("Kỹ năng này chưa có dữ liệu để xóa.");
        return;
    }

    const ok = window.confirm(`Xóa toàn bộ ${count} học sinh của kỹ năng ${skill.name} trong lớp ${state.selectedClass}?`);
    if (!ok) return;

    addTrashItems((state.data.records[recordKey] || []).map((record) =>
        buildRecordTrashItem(record, recordKey, "Xóa điểm kỹ năng đang chọn")
    ));
    state.data.records[recordKey] = [];
    saveState();
    renderTable();
    resetForm();
    showToast("Đã xóa điểm kỹ năng đang chọn.");
}

function addSchool() {
    const name = normalizeName(window.prompt("Nhập tên trường mới:"));
    if (!name) return;

    const isDuplicate = state.data.schools.some((school) => getSearchableText(school.name) === getSearchableText(name));
    if (isDuplicate) {
        showToast("Tên trường này đã tồn tại.");
        return;
    }

    const gradesInput = window.prompt("Nhập khối của trường, ví dụ: 6 hoặc 7,8:");
    const gradeList = parseGradeList(gradesInput);
    if (!gradeList.length) {
        showToast("Bạn cần nhập ít nhất 1 khối, ví dụ: 6 hoặc 7,8.");
        return;
    }

    const school = {
        id: createId("school"),
        name,
        grades: makeGradesObject(gradeList),
        classConfigs: {},
    };

    state.data.schools.push(school);
    state.selectedSchoolId = school.id;
    state.selectedGrade = gradeList[0] || "";
    state.selectedClass = "";
    state.selectedSkillId = "";
    state.selectedTestId = "";
    saveState();
    resetForm(false);
    renderAll();
    showToast(`Đã thêm trường mới với ${gradeList.map(getGradeLabel).join(", ")}.`);
}

function deleteSchool() {
    const school = getSelectedSchool();
    if (!school) return;

    if (state.data.schools.length <= 1) {
        showToast("Cần giữ lại ít nhất 1 trường.");
        return;
    }

    const ok = window.confirm(`Xóa trường "${school.name}" và toàn bộ dữ liệu điểm thuộc trường này?`);
    if (!ok) return;

    const trashItems = [];
    Object.keys(state.data.records).forEach((recordKey) => {
        if (recordKey.startsWith(`${school.id}::`)) {
            (state.data.records[recordKey] || []).forEach((record) => {
                trashItems.push(buildRecordTrashItem(record, recordKey, "Xóa trường kèm điểm học sinh"));
            });
            delete state.data.records[recordKey];
        }
    });
    addTrashItems(trashItems);

    state.data.schools = state.data.schools.filter((item) => item.id !== school.id);
    state.selectedSchoolId = state.data.schools[0]?.id || "";
    state.selectedClass = "";
    state.selectedSkillId = "";
    ensureValidSelection();
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã xóa trường.");
}

function addGrade() {
    const school = getSelectedSchool();
    if (!school) {
        showToast("Hãy chọn trường trước khi thêm khối.");
        return;
    }

    ensureSchoolGradeStructure(school);
    const rawGrade = window.prompt("Nhập số khối mới, ví dụ: 8:");
    const grade = normalizeGradeInput(rawGrade);
    if (!grade) {
        showToast("Vui lòng nhập số khối hợp lệ, ví dụ: 8.");
        return;
    }

    if (school.grades[grade]) {
        showToast(`${getGradeLabel(grade)} đã tồn tại trong trường này.`);
        return;
    }

    school.grades[grade] = [];
    state.selectedGrade = grade;
    state.selectedClass = "";
    state.selectedSkillId = "";
    state.selectedTestId = "";
    saveState();
    resetForm(false);
    renderAll();
    showToast(`Đã thêm ${getGradeLabel(grade)}.`);
}

function editGrade() {
    const school = getSelectedSchool();
    if (!school || !state.selectedGrade) {
        showToast("Hãy chọn khối trước khi sửa.");
        return;
    }

    ensureSchoolGradeStructure(school);
    const oldGrade = state.selectedGrade;
    const rawGrade = window.prompt("Nhập số khối mới:", oldGrade);
    const newGrade = normalizeGradeInput(rawGrade);
    if (!newGrade) {
        showToast("Vui lòng nhập số khối hợp lệ.");
        return;
    }

    if (newGrade === oldGrade) return;

    if (school.grades[newGrade]) {
        showToast(`${getGradeLabel(newGrade)} đã tồn tại trong trường này.`);
        return;
    }

    const classList = school.grades[oldGrade] || [];
    school.grades[newGrade] = classList;
    delete school.grades[oldGrade];

    classList.forEach((className) => {
        const oldClassKey = getClassKey(school.id, oldGrade, className);
        const newClassKey = getClassKey(school.id, newGrade, className);

        if (school.classConfigs?.[oldClassKey]) {
            school.classConfigs[newClassKey] = school.classConfigs[oldClassKey];
            delete school.classConfigs[oldClassKey];
        }

        Object.keys(state.data.records).forEach((recordKey) => {
            if (!recordKey.startsWith(`${oldClassKey}::`)) return;
            const newRecordKey = recordKey.replace(`${oldClassKey}::`, `${newClassKey}::`);
            state.data.records[newRecordKey] = state.data.records[recordKey];
            delete state.data.records[recordKey];
            if (Array.isArray(state.data.records[newRecordKey])) {
                state.data.records[newRecordKey].forEach((record) => {
                    record.grade = newGrade;
                });
            }
        });
    });

    state.selectedGrade = newGrade;
    saveState();
    resetForm(false);
    renderAll();
    showToast(`Đã đổi ${getGradeLabel(oldGrade)} thành ${getGradeLabel(newGrade)}.`);
}

function deleteGrade() {
    const school = getSelectedSchool();
    if (!school || !state.selectedGrade) {
        showToast("Hãy chọn khối trước khi xóa.");
        return;
    }

    ensureSchoolGradeStructure(school);
    const grade = state.selectedGrade;
    const classList = school.grades[grade] || [];
    const ok = window.confirm(`Xóa ${getGradeLabel(grade)} và toàn bộ lớp/dữ liệu điểm thuộc khối này?`);
    if (!ok) return;

    const trashItems = [];
    classList.forEach((className) => {
        const classKey = getClassKey(school.id, grade, className);
        trashItems.push(buildMetadataTrashItem(
            "class-metadata",
            { schoolId: school.id, schoolName: school.name, grade, className },
            { grade, className, classConfig: JSON.parse(JSON.stringify(school.classConfigs?.[classKey] || {})) },
            "Xóa khối kèm lớp"
        ));
        Object.keys(state.data.records).forEach((recordKey) => {
            if (recordKey.startsWith(`${classKey}::`)) {
                (state.data.records[recordKey] || []).forEach((record) => {
                    trashItems.push(buildRecordTrashItem(record, recordKey, "Xóa khối kèm điểm học sinh"));
                });
                delete state.data.records[recordKey];
            }
        });
        delete school.classConfigs[classKey];
    });
    addTrashItems(trashItems);

    delete school.grades[grade];
    const remainingGrades = getSchoolGradeKeys(school);
    state.selectedGrade = remainingGrades[0] || "";
    state.selectedClass = "";
    state.selectedSkillId = "";
    state.selectedTestId = "";
    ensureValidSelection();
    saveState();
    resetForm(false);
    renderAll();
    showToast(`Đã xóa ${getGradeLabel(grade)}.`);
}


function addClass() {
    const school = getSelectedSchool();
    if (!school) {
        showToast("Hãy chọn trường trước.");
        return;
    }

    if (!state.selectedGrade) {
        showToast("Hãy thêm hoặc chọn khối trước khi thêm lớp.");
        return;
    }

    const className = normalizeName(window.prompt(`Nhập tên lớp mới cho ${school.name} - ${getGradeLabel(state.selectedGrade)}:`));
    if (!className) return;

    const classes = school.grades[state.selectedGrade] || [];
    if (classes.some((item) => getSearchableText(item) === getSearchableText(className))) {
        showToast("Lớp này đã tồn tại trong trường và khối đang chọn.");
        return;
    }

    classes.push(className);
    classes.sort((a, b) => collator.compare(a, b));
    school.grades[state.selectedGrade] = classes;
    ensureClassConfigForSchool(school, state.selectedGrade, className);

    state.selectedClass = className;
    state.selectedSkillId = DEFAULT_SKILL_ID;
    ensureValidSelection();
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã thêm lớp mới.");
}

function deleteClass() {
    const school = getSelectedSchool();
    if (!school || !state.selectedClass) {
        showToast("Hãy chọn lớp trước khi xóa.");
        return;
    }

    const className = state.selectedClass;
    const ok = window.confirm(`Xóa lớp "${className}" và toàn bộ dữ liệu điểm của lớp này?`);
    if (!ok) return;

    const classKey = getClassKey(school.id, state.selectedGrade, className);
    const trashItems = [buildMetadataTrashItem(
        "class-metadata",
        {
            schoolId: school.id,
            schoolName: school.name,
            grade: state.selectedGrade,
            className,
        },
        {
            grade: state.selectedGrade,
            className,
            classConfig: JSON.parse(JSON.stringify(school.classConfigs?.[classKey] || {})),
        },
        "Xóa lớp"
    )];

    Object.keys(state.data.records).forEach((recordKey) => {
        if (recordKey.startsWith(`${classKey}::`)) {
            (state.data.records[recordKey] || []).forEach((record) => {
                trashItems.push(buildRecordTrashItem(record, recordKey, "Xóa lớp kèm điểm học sinh"));
            });
        }
    });
    addTrashItems(trashItems);

    school.grades[state.selectedGrade] = (school.grades[state.selectedGrade] || []).filter((item) => item !== className);
    delete school.classConfigs[classKey];

    Object.keys(state.data.records).forEach((recordKey) => {
        if (recordKey.startsWith(`${classKey}::`)) {
            delete state.data.records[recordKey];
        }
    });

    state.selectedClass = "";
    state.selectedSkillId = "";
    ensureValidSelection();
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã xóa lớp.");
}


function addTest() {
    const config = getSelectedClassConfig();
    if (!config) {
        showToast("Hãy chọn lớp trước khi thêm bài làm.");
        return;
    }

    const name = normalizeName(window.prompt("Nhập tên bài làm, ví dụ: 15 phút lần 1, 45 phút, Thi học kỳ:"));
    if (!name) return;

    const isDuplicate = config.tests.some((test) => getSearchableText(test.name) === getSearchableText(name));
    if (isDuplicate) {
        showToast("Tên bài làm này đã tồn tại trong lớp đang chọn.");
        return;
    }

    const test = makeTest(name);
    config.tests.push(test);
    config.tests.sort((a, b) => collator.compare(a.name, b.name));
    state.selectedTestId = test.id;
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã thêm bài làm mới.");
}

function editTest() {
    const config = getSelectedClassConfig();
    const test = getSelectedTest();
    if (!config || !test) {
        showToast("Hãy chọn bài làm trước khi sửa.");
        return;
    }

    const oldName = test.name;
    const name = normalizeName(window.prompt("Sửa tên bài làm:", test.name));
    if (!name) return;

    const duplicate = config.tests.some(
        (item) => item.id !== test.id && getSearchableText(item.name) === getSearchableText(name)
    );
    if (duplicate) {
        showToast("Tên bài làm này đã tồn tại.");
        return;
    }

    test.name = name;

    const classKey = getSelectedClassKey();
    const configSkills = config.skills || [];
    configSkills.forEach((skill) => {
        const recordKey = getRecordKey(classKey, skill.id);
        const records = Array.isArray(state.data.records[recordKey]) ? state.data.records[recordKey] : [];
        records.forEach((record) => {
            const belongsById = record.testId === test.id;
            const belongsByOldName = getSearchableText(record.testName || "") === getSearchableText(oldName);
            if (belongsById || belongsByOldName) {
                record.testId = test.id;
                record.testName = test.name;
            }
        });
    });

    config.tests.sort((a, b) => collator.compare(a.name, b.name));
    state.selectedTestId = test.id;
    saveState();
    renderAll();
    showToast("Đã cập nhật bài làm.");
}

function deleteTest() {
    const config = getSelectedClassConfig();
    const test = getSelectedTest();
    if (!config || !test) {
        showToast("Hãy chọn bài làm trước khi xóa.");
        return;
    }

    const classKey = getSelectedClassKey();
    let recordCount = 0;
    (config.skills || []).forEach((skill) => {
        const recordKey = getRecordKey(classKey, skill.id);
        const records = Array.isArray(state.data.records[recordKey]) ? state.data.records[recordKey] : [];
        recordCount += records.filter((record) => recordBelongsToTestAnySemester(record, test)).length;
    });

    const ok = window.confirm(
        `Xóa bài làm "${test.name}" ở tất cả học kỳ?${recordCount ? `\nĐiều này cũng xóa ${recordCount} dòng điểm thuộc bài làm này.` : ""
        }`
    );
    if (!ok) return;

    const trashItems = [buildMetadataTrashItem(
        "test-metadata",
        {
            schoolId: getSelectedSchool()?.id,
            schoolName: getSelectedSchool()?.name,
            grade: state.selectedGrade,
            className: state.selectedClass,
            testId: test.id,
            testName: test.name,
        },
        { test: JSON.parse(JSON.stringify(test)) },
        "Xóa bài làm"
    )];

    (config.skills || []).forEach((skill) => {
        const recordKey = getRecordKey(classKey, skill.id);
        const records = Array.isArray(state.data.records[recordKey]) ? state.data.records[recordKey] : [];
        records.filter((record) => recordBelongsToTestAnySemester(record, test)).forEach((record) => {
            trashItems.push(buildRecordTrashItem(record, recordKey, "Xóa bài làm kèm điểm học sinh"));
        });
        state.data.records[recordKey] = records.filter((record) => !recordBelongsToTestAnySemester(record, test));
    });
    addTrashItems(trashItems);

    config.tests = config.tests.filter((item) => item.id !== test.id);
    state.selectedTestId = config.tests[0]?.id || "";
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã xóa bài làm.");
}

function addSkill() {
    const config = getSelectedClassConfig();
    if (!config) {
        showToast("Hãy chọn lớp trước khi thêm kỹ năng.");
        return;
    }

    const name = normalizeName(window.prompt("Nhập tên kỹ năng mới, ví dụ: Listening, Writing, Speaking:"));
    if (!name) return;

    if (config.skills.some((skill) => getSearchableText(skill.name) === getSearchableText(name))) {
        showToast("Kỹ năng này đã tồn tại trong lớp đang chọn.");
        return;
    }

    const skill = makeDefaultSkill(name);
    config.skills.push(skill);
    state.selectedSkillId = skill.id;
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã thêm kỹ năng mới cho lớp đang chọn.");
}

function deleteSkill() {
    const config = getSelectedClassConfig();
    const skill = getSelectedSkill();
    if (!config || !skill) {
        showToast("Hãy chọn kỹ năng trước khi xóa.");
        return;
    }

    if (config.skills.length <= 1) {
        showToast("Mỗi lớp cần có ít nhất 1 kỹ năng.");
        return;
    }

    const ok = window.confirm(`Xóa kỹ năng "${skill.name}" và toàn bộ điểm thuộc kỹ năng này?`);
    if (!ok) return;

    const classKey = getSelectedClassKey();
    const recordKey = getRecordKey(classKey, skill.id);
    const trashItems = (state.data.records[recordKey] || []).map((record) =>
        buildRecordTrashItem(record, recordKey, "Xóa kỹ năng kèm điểm học sinh")
    );
    addTrashItems(trashItems);
    delete state.data.records[recordKey];

    config.skills = config.skills.filter((item) => item.id !== skill.id);
    state.selectedSkillId = config.skills[0]?.id || "";
    saveState();
    resetForm(false);
    renderAll();
    showToast("Đã xóa kỹ năng.");
}

function addPart() {
    const skill = getSelectedSkill();
    if (!skill) {
        showToast("Hãy chọn kỹ năng trước khi thêm part.");
        return;
    }

    skill.parts.push({
        id: createId("part"),
        label: `Part ${skill.parts.length + 1}`,
        maxQuestions: 1,
        maxPoints: 1,
    });

    saveState();
    renderAll({ keepForm: true });
    showToast("Đã thêm part mới.");
}

function deletePart(partId) {
    const skill = getSelectedSkill();
    if (!skill) return;

    if (skill.parts.length <= 1) {
        showToast("Mỗi kỹ năng cần có ít nhất 1 part.");
        return;
    }

    const part = skill.parts.find((item) => item.id === partId);
    if (!part) return;

    const ok = window.confirm(`Xóa ${part.label}? Điểm đã lưu của part này cũng sẽ bị bỏ khỏi tổng điểm.`);
    if (!ok) return;

    skill.parts = skill.parts.filter((item) => item.id !== partId);
    getCurrentRecordsRaw().forEach((record) => {
        if (record.answers) delete record.answers[partId];
        if (record.scores) delete record.scores[partId];
        recalculateRecord(record, skill);
    });

    saveState();
    renderAll({ keepForm: true });
    showToast("Đã xóa part.");
}

function updatePartConfig(input) {
    const row = input.closest("[data-config-part-id]");
    const skill = getSelectedSkill();
    if (!row || !skill) return;

    const part = skill.parts.find((item) => item.id === row.dataset.configPartId);
    if (!part) return;

    const field = input.dataset.partField;

    if (field === "label") {
        part.label = normalizeName(input.value) || "Part";
        input.value = part.label;
    }

    if (field === "maxQuestions") {
        part.maxQuestions = clampPositiveInteger(input.value, part.maxQuestions || 1);
        input.value = part.maxQuestions;
    }

    if (field === "maxPoints") {
        part.maxPoints = clampPositiveNumber(input.value, part.maxPoints || 1);
        input.value = part.maxPoints;
    }

    recalculateCurrentSkillRecords();
    saveState();
    renderPartScoreInputs(getCurrentFormAnswers());
    renderTable();
}

function handlePartConfigClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "delete-part") {
        deletePart(button.dataset.id);
    }
}

function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") {
        editRecord(id);
    } else if (action === "delete") {
        deleteRecord(id);
    }
}

function getSortedRecordsForSkill(recordKey, skill, mode = state.sortMode) {
    const records = Array.isArray(state.data.records[recordKey]) ? state.data.records[recordKey] : [];
    return records.map((record) => recalculateRecord(record, skill)).sort(compareStudentsFactory(mode));
}

function collectCurrentSkillSheet() {
    const school = getSelectedSchool();
    const skill = getSelectedSkill();
    const recordKey = getSelectedRecordKey();
    if (!school || !skill || !recordKey) return null;

    const records = getSortedRecordsForSkill(recordKey, skill, state.sortMode);
    if (!records.length) return null;

    return {
        sheetName: `${state.selectedClass}-${skill.name}`,
        meta: { school, grade: state.selectedGrade, className: state.selectedClass, skill },
        rows: buildSheetRows(records, school, state.selectedGrade, state.selectedClass, skill),
    };
}

function collectCurrentClassSheets() {
    const school = getSelectedSchool();
    const config = getSelectedClassConfig();
    const classKey = getSelectedClassKey();
    if (!school || !config || !classKey) return [];

    return config.skills
        .map((skill) => {
            const recordKey = getRecordKey(classKey, skill.id);
            const records = getSortedRecordsForSkill(recordKey, skill, state.sortMode);
            if (!records.length) return null;
            return {
                sheetName: `${state.selectedClass}-${skill.name}`,
                meta: { school, grade: state.selectedGrade, className: state.selectedClass, skill },
                rows: buildSheetRows(records, school, state.selectedGrade, state.selectedClass, skill),
            };
        })
        .filter(Boolean);
}

function collectAllSheets() {
    const sheets = [];

    state.data.schools.forEach((school) => {
        getSchoolGradeKeys(school).forEach((grade) => {
            (school.grades[grade] || []).forEach((className) => {
                const config = ensureClassConfigForSchool(school, grade, className);
                const classKey = getClassKey(school.id, grade, className);

                config.skills.forEach((skill) => {
                    const recordKey = getRecordKey(classKey, skill.id);
                    const records = getSortedRecordsForSkill(recordKey, skill, state.sortMode);
                    if (!records.length) return;

                    sheets.push({
                        sheetName: `${className}-${skill.name}`,
                        meta: { school, grade, className, skill },
                        rows: buildSheetRows(records, school, grade, className, skill),
                    });
                });
            });
        });
    });

    return sheets;
}

function exportCurrentSkill() {
    const sheet = collectCurrentSkillSheet();
    if (!sheet) {
        showToast("Kỹ năng đang chọn chưa có dữ liệu để xuất.");
        return;
    }

    exportWorkbook([sheet], `bang-diem-${state.selectedClass}-${getSelectedSkill().name}`, getExportOptions());
    showToast("Đã xuất file .xlsx cho kỹ năng đang chọn.");
}

function exportCurrentClass() {
    const sheets = collectCurrentClassSheets();
    if (!sheets.length) {
        showToast("Lớp đang chọn chưa có dữ liệu để xuất.");
        return;
    }

    exportWorkbook(sheets, `bang-diem-${state.selectedClass}`, getExportOptions());
    showToast("Đã xuất file .xlsx cho lớp đang chọn.");
}

function exportAllData() {
    const sheets = collectAllSheets();
    if (!sheets.length) {
        showToast("Chưa có dữ liệu để xuất file.");
        return;
    }

    exportWorkbook(sheets, "bang-diem-tat-ca-du-lieu", getExportOptions());
    showToast("Đã xuất file .xlsx cho toàn bộ dữ liệu.");
}

function getExportOptions() {
    const includeStaticSheet = window.confirm(
        "Bạn có muốn xuất kèm sheet thống kê/xếp hạng không?\n\nOK = Có sheet thống kê\nCancel = Chỉ xuất bảng điểm"
    );

    if (!includeStaticSheet) {
        return { includeStaticSheet: false, staticSheetPassword: "" };
    }

    const usePassword = window.confirm(
        "Bạn có muốn đặt mật khẩu bảo vệ sheet thống kê không?\n\nOK = Có mật khẩu\nCancel = Không đặt mật khẩu"
    );

    const staticSheetPassword = usePassword
        ? window.prompt("Nhập mật khẩu cho sheet thống kê:") || ""
        : "";

    return { includeStaticSheet: true, staticSheetPassword };
}

function sanitizeFileName(value) {
    return removeVietnameseTones(String(value || "file"))
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "file";
}

function sanitizeSheetName(name) {
    return String(name || "Sheet")
        .replace(/[\\/?*\[\]:]/g, "-")
        .slice(0, 31);
}

function toExcelColumnName(index) {
    let result = "";
    let current = index + 1;
    while (current > 0) {
        const remainder = (current - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        current = Math.floor((current - 1) / 26);
    }
    return result;
}

function escapeXml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildSheetRows(records, school, grade, className, skill) {
    const hasTestInfo = records.some((item) => item.testName || item.semester);
    const header = ["STT", "Trường", "Khối", "Lớp", "Kỹ năng"];

    if (hasTestInfo) {
        header.push("Tên bài làm", "Học kỳ");
    }

    header.push("Họ và tên");

    // Excel only exports score for each part. Correct-answer counts are kept in the app UI only.
    skill.parts.forEach((part) => {
        header.push(`Điểm ${part.label}`);
    });
    header.push("Tổng điểm");

    const dataRows = records.map((item, index) => {
        const row = [index + 1, school.name, getGradeLabel(grade), className, skill.name];

        if (hasTestInfo) {
            row.push(item.testName || "", SEMESTER_LABELS[item.semester] || item.semester || "");
        }

        row.push(item.fullName);

        skill.parts.forEach((part) => {
            row.push(Number(item.scores?.[part.id] || 0));
        });
        row.push(Number(item.total || 0));
        return row;
    });

    return [header, ...dataRows];
}

function buildStaticSheetEntry(sheetEntries, password = "") {
    const statItems = [];

    sheetEntries.forEach((sheet) => {
        const header = sheet.rows?.[0] || [];
        const nameIndex = header.indexOf("Họ và tên");
        const totalIndex = header.indexOf("Tổng điểm");
        const testIndex = header.indexOf("Tên bài làm");
        const semesterIndex = header.indexOf("Học kỳ");
        if (nameIndex === -1 || totalIndex === -1) return;

        sheet.rows.slice(1).forEach((row) => {
            const fullName = normalizeName(row[nameIndex]);
            const total = Number(row[totalIndex]);
            if (!fullName || !Number.isFinite(total)) return;
            statItems.push({
                source: sheet.sheetName,
                fullName,
                testName: testIndex === -1 ? "" : row[testIndex] || "",
                semester: semesterIndex === -1 ? "" : row[semesterIndex] || "",
                total: Number(total.toFixed(2)),
            });
        });
    });

    const rows = [];
    rows.push(["THỐNG KÊ BẢNG ĐIỂM"]);
    rows.push([]);
    rows.push(["BẢNG XẾP HẠNG HỌC SINH"]);
    rows.push(["Hạng", "Nguồn dữ liệu", "Họ và tên", "Tên bài làm", "Học kỳ", "Tổng điểm"]);

    const rankedItems = [...statItems].sort((a, b) => {
        const scoreCompare = Number(b.total) - Number(a.total);
        if (scoreCompare !== 0) return scoreCompare;
        return collator.compare(a.fullName, b.fullName);
    });

    let currentRank = 0;
    let previousScore = null;
    rankedItems.forEach((item, index) => {
        if (previousScore === null || item.total !== previousScore) {
            currentRank = index + 1;
            previousScore = item.total;
        }
        rows.push([currentRank, item.source, item.fullName, item.testName, item.semester, item.total]);
    });

    rows.push([]);
    rows.push(["TỔNG HỢP NHÓM ĐIỂM"]);
    rows.push(["Nhóm điểm", "Số học sinh", "Tỉ lệ %"]);
    const groupDataStartRow = rows.length + 1;
    const groupMap = new Map();
    statItems.forEach((item) => {
        const score = Number(item.total.toFixed(2));
        groupMap.set(score, (groupMap.get(score) || 0) + 1);
    });

    const groupedScores = [...groupMap.entries()].sort((a, b) => a[0] - b[0]);
    groupedScores.forEach(([score, count]) => {
        const percent = statItems.length ? Number(((count / statItems.length) * 100).toFixed(2)) : 0;
        rows.push([score, count, percent]);
    });

    rows.push([]);
    rows.push(["Ghi chú", "Biểu đồ bên phải thể hiện tỉ lệ % học sinh theo từng nhóm điểm."]);

    const groupDataEndRow = groupDataStartRow + groupedScores.length - 1;

    return {
        sheetName: "Static",
        rows,
        protectedPassword: password,
        chart: groupedScores.length
            ? {
                title: "Tỉ lệ % học sinh theo nhóm điểm",
                categoryStartRow: groupDataStartRow,
                categoryEndRow: groupDataEndRow,
                categoryColumn: "A",
                valueColumn: "C",
            }
            : null,
    };
}

function buildColumnWidths(rows) {
    const header = rows[0] || [];
    return Array.from({ length: Math.max(...rows.map((row) => row.length), 1) }, (_, index) => {
        const title = String(header[index] || "").toLowerCase();
        if (index === 0) return 8;
        if (title.includes("trường") || title.includes("nguồn")) return 26;
        if (title.includes("họ") || title.includes("tên")) return 32;
        if (title.includes("ghi chú")) return 42;
        if (title.includes("tỉ lệ")) return 13;
        if (title.includes("điểm") || title.includes("hạng") || title.includes("số học sinh")) return 13;
        return 15;
    });
}

function legacyExcelPasswordHash(password) {
    if (!password) return "";
    let hash = 0;
    String(password).split("").forEach((char, index) => {
        let value = char.charCodeAt(0) << (index + 1);
        const rotatedBits = value >> 15;
        value &= 0x7fff;
        hash ^= value | rotatedBits;
    });
    hash ^= String(password).length;
    hash ^= 0xce4b;
    return (hash & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function buildSheetXml(rows, options = {}) {
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    const columnWidths = buildColumnWidths(rows);
    const colsXml = columnWidths
        .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
        .join("");

    const protectionXml = options.protectedPassword
        ? `<sheetProtection password="${legacyExcelPasswordHash(options.protectedPassword)}" sheet="1" objects="1" scenarios="1"/>`
        : "";

    const drawingXml = options.hasDrawing ? '<drawing r:id="rId1"/>' : "";

    const sheetDataXml = rows
        .map((row, rowIndex) => {
            const cellsXml = row
                .map((value, colIndex) => {
                    const cellRef = `${toExcelColumnName(colIndex)}${rowIndex + 1}`;
                    const isHeader = rowIndex === 0;
                    const isNameColumn = colIndex === 1 || colIndex === 5;
                    const styleIndex = isHeader ? 1 : isNameColumn ? 2 : 3;

                    if (typeof value === "number") {
                        return `<c r="${cellRef}" s="${styleIndex}"><v>${value}</v></c>`;
                    }

                    return `<c r="${cellRef}" t="inlineStr" s="${styleIndex}"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
                })
                .join("");
            return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
        })
        .join("");

    const dimensionRef = `A1:${toExcelColumnName(columnCount - 1)}${Math.max(rows.length, 1)}`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimensionRef}"/>
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${colsXml}</cols>
  ${protectionXml}
  <sheetData>${sheetDataXml}</sheetData>
  ${drawingXml}
</worksheet>`;
}

function buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDDEBFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function makeUniqueSheetName(name, usedNames) {
    const base = sanitizeSheetName(name) || "Sheet";
    let candidate = base;
    let counter = 2;
    while (usedNames.has(candidate.toLowerCase())) {
        const suffix = `-${counter}`;
        candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        counter += 1;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

function escapeFormulaSheetName(sheetName) {
    return `'${String(sheetName).replace(/'/g, "''")}'`;
}

function buildDrawingXml(chartId) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor editAs="oneCell">
    <xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${chartId + 1}" name="Biểu đồ nhóm điểm"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
      </xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function buildDrawingRelsXml(chartId) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartId}.xml"/>
</Relationships>`;
}

function buildWorksheetDrawingRelsXml(drawingId) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingId}.xml"/>
</Relationships>`;
}

function buildPieChartXml(chart, sheetName) {
    const escapedSheetName = escapeFormulaSheetName(sheetName);
    const categoryRange = `${escapedSheetName}!$${chart.categoryColumn}$${chart.categoryStartRow}:$${chart.categoryColumn}$${chart.categoryEndRow}`;
    const valueRange = `${escapedSheetName}!$${chart.valueColumn}$${chart.categoryStartRow}:$${chart.valueColumn}$${chart.categoryEndRow}`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="vi-VN"/>
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN" sz="1200" b="1"/><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx>
      <c:layout/>
    </c:title>
    <c:plotArea>
      <c:layout/>
      <c:pieChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx><c:v>${escapeXml(chart.title)}</c:v></c:tx>
          <c:cat><c:strRef><c:f>${escapeXml(categoryRange)}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${escapeXml(valueRange)}</c:f></c:numRef></c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="r"/>
      <c:layout/>
    </c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:printSettings>
    <c:headerFooter/>
    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
    <c:pageSetup/>
  </c:printSettings>
</c:chartSpace>`;
}

function buildWorkbookFiles(sheetEntries) {
    const usedSheetNames = new Set();
    const normalizedSheets = sheetEntries.map((sheet) => ({
        ...sheet,
        safeSheetName: makeUniqueSheetName(sheet.sheetName, usedSheetNames),
    }));

    const chartSheets = normalizedSheets.filter((sheet) => sheet.chart);

    const workbookSheetsXml = normalizedSheets
        .map(
            (sheet, index) =>
                `<sheet name="${escapeXml(sheet.safeSheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
        )
        .join("");

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheetsXml}</sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${normalizedSheets
            .map(
                (_, index) =>
                    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
            )
            .join("")}
  <Relationship Id="rId${normalizedSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${normalizedSheets
            .map(
                (_, index) =>
                    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
            )
            .join("")}
  ${chartSheets
            .map((_, index) => {
                const chartId = index + 1;
                return `<Override PartName="/xl/drawings/drawing${chartId}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  <Override PartName="/xl/charts/chart${chartId}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
            })
            .join("\n  ")}
</Types>`;

    const files = [
        { path: "[Content_Types].xml", content: contentTypesXml },
        { path: "_rels/.rels", content: rootRelsXml },
        { path: "xl/workbook.xml", content: workbookXml },
        { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
        { path: "xl/styles.xml", content: buildStylesXml() },
    ];

    let chartId = 1;
    normalizedSheets.forEach((sheet, index) => {
        const sheetNumber = index + 1;
        const currentChartId = sheet.chart ? chartId : null;

        files.push({
            path: `xl/worksheets/sheet${sheetNumber}.xml`,
            content: buildSheetXml(sheet.rows, {
                protectedPassword: sheet.protectedPassword,
                hasDrawing: Boolean(sheet.chart),
            }),
        });

        if (sheet.chart && currentChartId) {
            files.push({
                path: `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`,
                content: buildWorksheetDrawingRelsXml(currentChartId),
            });
            files.push({
                path: `xl/drawings/drawing${currentChartId}.xml`,
                content: buildDrawingXml(currentChartId),
            });
            files.push({
                path: `xl/drawings/_rels/drawing${currentChartId}.xml.rels`,
                content: buildDrawingRelsXml(currentChartId),
            });
            files.push({
                path: `xl/charts/chart${currentChartId}.xml`,
                content: buildPieChartXml(sheet.chart, sheet.safeSheetName),
            });
            chartId += 1;
        }
    });

    return files;
}

function makeCrc32Table() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let j = 0; j < 8; j += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
        crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach((chunk) => {
        merged.set(chunk, offset);
        offset += chunk.length;
    });
    return merged;
}

function writeUInt16LE(view, offset, value) {
    view.setUint16(offset, value, true);
}

function writeUInt32LE(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
}

function createZipStore(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach((file) => {
        const nameBytes = encoder.encode(file.path);
        const dataBytes = encoder.encode(file.content);
        const fileCrc = crc32(dataBytes);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(localHeader.buffer);
        writeUInt32LE(localView, 0, 0x04034b50);
        writeUInt16LE(localView, 4, 20);
        writeUInt16LE(localView, 6, 0);
        writeUInt16LE(localView, 8, 0);
        writeUInt16LE(localView, 10, 0);
        writeUInt16LE(localView, 12, 0);
        writeUInt32LE(localView, 14, fileCrc);
        writeUInt32LE(localView, 18, dataBytes.length);
        writeUInt32LE(localView, 22, dataBytes.length);
        writeUInt16LE(localView, 26, nameBytes.length);
        writeUInt16LE(localView, 28, 0);
        localHeader.set(nameBytes, 30);
        localParts.push(localHeader, dataBytes);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        writeUInt32LE(centralView, 0, 0x02014b50);
        writeUInt16LE(centralView, 4, 20);
        writeUInt16LE(centralView, 6, 20);
        writeUInt16LE(centralView, 8, 0);
        writeUInt16LE(centralView, 10, 0);
        writeUInt16LE(centralView, 12, 0);
        writeUInt16LE(centralView, 14, 0);
        writeUInt32LE(centralView, 16, fileCrc);
        writeUInt32LE(centralView, 20, dataBytes.length);
        writeUInt32LE(centralView, 24, dataBytes.length);
        writeUInt16LE(centralView, 28, nameBytes.length);
        writeUInt16LE(centralView, 30, 0);
        writeUInt16LE(centralView, 32, 0);
        writeUInt16LE(centralView, 34, 0);
        writeUInt16LE(centralView, 36, 0);
        writeUInt32LE(centralView, 38, 0);
        writeUInt32LE(centralView, 42, offset);
        centralHeader.set(nameBytes, 46);
        centralParts.push(centralHeader);

        offset += localHeader.length + dataBytes.length;
    });

    const centralDirectory = concatUint8Arrays(centralParts);
    const localSection = concatUint8Arrays(localParts);

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    writeUInt32LE(eocdView, 0, 0x06054b50);
    writeUInt16LE(eocdView, 4, 0);
    writeUInt16LE(eocdView, 6, 0);
    writeUInt16LE(eocdView, 8, files.length);
    writeUInt16LE(eocdView, 10, files.length);
    writeUInt32LE(eocdView, 12, centralDirectory.length);
    writeUInt32LE(eocdView, 16, localSection.length);
    writeUInt16LE(eocdView, 20, 0);

    return concatUint8Arrays([localSection, centralDirectory, eocd]);
}

function downloadBytes(bytes, filename, mimeType) {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWorkbook(sheetEntries, fileLabel, options = {}) {
    if (!sheetEntries.length) {
        showToast("Chưa có dữ liệu để xuất file.");
        return;
    }

    const finalSheetEntries = [...sheetEntries];

    if (options.includeStaticSheet) {
        finalSheetEntries.push(buildStaticSheetEntry(sheetEntries, options.staticSheetPassword || ""));
    }

    const files = buildWorkbookFiles(finalSheetEntries);
    const zipBytes = createZipStore(files);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `${sanitizeFileName(fileLabel)}-${dateStamp}.xlsx`;

    downloadBytes(
        zipBytes,
        filename,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
}


function getUint16LE(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
}

function getUint32LE(bytes, offset) {
    return (
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)
    ) >>> 0;
}

function decodeUtf8(bytes) {
    return new TextDecoder("utf-8").decode(bytes);
}

async function decompressZipEntry(data, method, fileName) {
    if (method === 0) return data;

    if (method === 8 && typeof DecompressionStream !== "undefined") {
        const formats = ["deflate-raw", "deflate"];

        for (const format of formats) {
            try {
                const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream(format));
                const arrayBuffer = await new Response(stream).arrayBuffer();
                return new Uint8Array(arrayBuffer);
            } catch (error) {
                // Try the next browser-supported deflate format.
            }
        }
    }

    throw new Error(
        `Không đọc được file nén trong Excel: ${fileName}. Hãy nhập file .xlsx được xuất trực tiếp từ web, hoặc dùng trình duyệt Chrome/Edge mới.`
    );
}

async function unzipXlsxEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const minEocdSize = 22;
    const maxCommentSize = 65535;
    const start = Math.max(0, bytes.length - minEocdSize - maxCommentSize);
    let eocdOffset = -1;

    for (let offset = bytes.length - minEocdSize; offset >= start; offset -= 1) {
        if (getUint32LE(bytes, offset) === 0x06054b50) {
            eocdOffset = offset;
            break;
        }
    }

    if (eocdOffset === -1) {
        throw new Error("File này không phải .xlsx hợp lệ hoặc đã bị lỗi.");
    }

    const entryCount = getUint16LE(bytes, eocdOffset + 10);
    const centralDirectoryOffset = getUint32LE(bytes, eocdOffset + 16);
    const entries = {};
    let offset = centralDirectoryOffset;

    for (let i = 0; i < entryCount; i += 1) {
        if (getUint32LE(bytes, offset) !== 0x02014b50) {
            throw new Error("Cấu trúc file Excel không hợp lệ.");
        }

        const method = getUint16LE(bytes, offset + 10);
        const compressedSize = getUint32LE(bytes, offset + 20);
        const fileNameLength = getUint16LE(bytes, offset + 28);
        const extraLength = getUint16LE(bytes, offset + 30);
        const commentLength = getUint16LE(bytes, offset + 32);
        const localHeaderOffset = getUint32LE(bytes, offset + 42);
        const fileNameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLength);
        const fileName = decodeUtf8(fileNameBytes);

        if (getUint32LE(bytes, localHeaderOffset) !== 0x04034b50) {
            throw new Error(`Không đọc được sheet/file trong Excel: ${fileName}`);
        }

        const localFileNameLength = getUint16LE(bytes, localHeaderOffset + 26);
        const localExtraLength = getUint16LE(bytes, localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
        entries[fileName] = await decompressZipEntry(compressedData, method, fileName);

        offset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
}

function getZipText(entries, path) {
    const bytes = entries[path];
    return bytes ? decodeUtf8(bytes) : "";
}

function parseXml(text, label) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
        throw new Error(`Không đọc được XML trong file Excel: ${label}`);
    }
    return doc;
}

function getXmlElements(root, localName) {
    return Array.from(root.getElementsByTagNameNS("*", localName));
}

function firstXmlElement(root, localName) {
    return getXmlElements(root, localName)[0] || null;
}

function resolveZipPath(basePath, target) {
    if (!target) return "";
    if (target.startsWith("/")) return target.replace(/^\/+/, "");

    const parts = basePath.split("/").slice(0, -1);
    target.split("/").forEach((part) => {
        if (!part || part === ".") return;
        if (part === "..") {
            parts.pop();
            return;
        }
        parts.push(part);
    });

    return parts.join("/");
}

function getRelationshipId(element) {
    return (
        element.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
        element.getAttribute("r:id") ||
        element.getAttribute("id") ||
        ""
    );
}

function parseSharedStrings(entries) {
    const text = getZipText(entries, "xl/sharedStrings.xml");
    if (!text) return [];

    const doc = parseXml(text, "sharedStrings.xml");
    return getXmlElements(doc, "si").map((item) => getXmlElements(item, "t").map((node) => node.textContent || "").join(""));
}

function columnNameToIndex(cellRef) {
    const letters = String(cellRef || "").match(/[A-Z]+/i)?.[0] || "";
    let index = 0;

    letters.toUpperCase().split("").forEach((letter) => {
        index = index * 26 + (letter.charCodeAt(0) - 64);
    });

    return Math.max(0, index - 1);
}

function getCellValue(cell, sharedStrings) {
    const type = cell.getAttribute("t") || "";

    if (type === "inlineStr") {
        const inlineString = firstXmlElement(cell, "is");
        return inlineString ? inlineString.textContent || "" : "";
    }

    const valueElement = firstXmlElement(cell, "v");
    const rawValue = valueElement ? valueElement.textContent || "" : "";

    if (type === "s") {
        return sharedStrings[Number(rawValue)] || "";
    }

    if (type === "b") {
        return rawValue === "1";
    }

    const numericValue = Number(rawValue);
    return rawValue !== "" && Number.isFinite(numericValue) ? numericValue : rawValue;
}

function parseWorksheetRows(sheetXml, sharedStrings, label) {
    const doc = parseXml(sheetXml, label);
    const rowElements = getXmlElements(doc, "row");
    const rows = [];

    rowElements.forEach((rowElement) => {
        const rowIndex = Math.max(0, Number(rowElement.getAttribute("r") || rows.length + 1) - 1);
        const row = [];

        getXmlElements(rowElement, "c").forEach((cell) => {
            const cellIndex = columnNameToIndex(cell.getAttribute("r"));
            row[cellIndex] = getCellValue(cell, sharedStrings);
        });

        rows[rowIndex] = row;
    });

    return rows.filter((row) => Array.isArray(row) && row.some((cell) => normalizeName(cell) !== ""));
}

function parseWorkbookSheets(entries) {
    const workbookText = getZipText(entries, "xl/workbook.xml");
    const relsText = getZipText(entries, "xl/_rels/workbook.xml.rels");

    if (!workbookText || !relsText) {
        throw new Error("File Excel thiếu workbook hoặc danh sách sheet.");
    }

    const workbookDoc = parseXml(workbookText, "workbook.xml");
    const relsDoc = parseXml(relsText, "workbook.xml.rels");
    const relMap = new Map();

    getXmlElements(relsDoc, "Relationship").forEach((relationship) => {
        relMap.set(relationship.getAttribute("Id"), relationship.getAttribute("Target"));
    });

    const sharedStrings = parseSharedStrings(entries);

    return getXmlElements(workbookDoc, "sheet")
        .map((sheet) => {
            const relId = getRelationshipId(sheet);
            const target = relMap.get(relId);
            const path = resolveZipPath("xl/workbook.xml", target);
            const sheetXml = getZipText(entries, path);

            return {
                name: sheet.getAttribute("name") || "Sheet",
                path,
                rows: sheetXml ? parseWorksheetRows(sheetXml, sharedStrings, path) : [],
            };
        })
        .filter((sheet) => sheet.rows.length);
}

function normalizeHeaderText(value) {
    return getSearchableText(String(value || ""));
}

function parseScoreValue(value) {
    if (typeof value === "number") return Number(value.toFixed(2));

    const text = String(value ?? "").trim().replace(",", ".");
    if (!text) return 0;

    const score = Number(text);
    return Number.isFinite(score) ? Number(score.toFixed(2)) : 0;
}

function getPartLabelFromExcelHeader(value) {
    const raw = normalizeName(value);
    const normalized = normalizeHeaderText(raw);

    if (!normalized.startsWith("diem ") || normalized === "tong diem") return "";

    return normalizeName(raw.replace(/^\s*Điểm\s+/i, "").replace(/^\s*Diem\s+/i, "")) || raw;
}

function parseSemesterFromExcel(value) {
    const normalized = removeVietnameseTones(String(value || ""))
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    if (/(^|\s)(ii|2)($|\s)/.test(normalized) || normalized.includes("hoc ky ii") || normalized.includes("hk2")) {
        return "II";
    }

    return "I";
}

function findHeaderIndex(rows) {
    return rows.findIndex((row) => {
        const headers = row.map(normalizeHeaderText);
        return headers.includes("ho va ten") && headers.includes("tong diem");
    });
}

function getExcelColumnIndexes(header) {
    const indexes = {
        school: -1,
        grade: -1,
        className: -1,
        skill: -1,
        test: -1,
        semester: -1,
        fullName: -1,
        total: -1,
    };

    header.forEach((cell, index) => {
        const name = normalizeHeaderText(cell);
        if (name === "truong") indexes.school = index;
        if (name === "khoi") indexes.grade = index;
        if (name === "lop") indexes.className = index;
        if (name === "ky nang") indexes.skill = index;
        if (name === "ten bai lam") indexes.test = index;
        if (name === "hoc ky") indexes.semester = index;
        if (name === "ho va ten") indexes.fullName = index;
        if (name === "tong diem") indexes.total = index;
    });

    return indexes;
}

function buildPartDefinitionsFromExcel(header, dataRows) {
    return header
        .map((cell, index) => ({ label: getPartLabelFromExcelHeader(cell), index }))
        .filter((item) => item.label)
        .map((item) => {
            const maxImportedScore = Math.max(...dataRows.map((row) => parseScoreValue(row[item.index])), 0);
            const safeMaxPoints = maxImportedScore > 0 ? Number(maxImportedScore.toFixed(2)) : 1;

            return {
                ...item,
                maxPoints: safeMaxPoints,
                maxQuestions: Math.max(1, Math.round(safeMaxPoints)),
            };
        });
}

function findOrCreateSchoolFromImport(schoolName) {
    const safeName = normalizeName(schoolName) || "Trường nhập từ Excel";
    let school = state.data.schools.find((item) => getSearchableText(item.name) === getSearchableText(safeName));

    if (!school) {
        school = {
            id: createId("school"),
            name: safeName,
            grades: {},
            classConfigs: {},
        };
        state.data.schools.push(school);
    }

    ensureSchoolGradeStructure(school);
    return school;
}

function ensureImportedClassConfig(school, grade, className) {
    const safeGrade = normalizeGradeInput(grade) || "6";
    const safeClassName = normalizeName(className) || `${safeGrade}A`;

    ensureSchoolGradeStructure(school);

    if (!school.grades[safeGrade]) {
        school.grades[safeGrade] = [];
    }

    if (!school.grades[safeGrade].some((item) => getSearchableText(item) === getSearchableText(safeClassName))) {
        school.grades[safeGrade].push(safeClassName);
        school.grades[safeGrade].sort((a, b) => collator.compare(a, b));
    }

    return {
        grade: safeGrade,
        className: safeClassName,
        config: ensureClassConfigForSchool(school, safeGrade, safeClassName),
    };
}

function findOrCreateSkillFromImport(config, skillName, partDefinitions) {
    const safeSkillName = normalizeName(skillName) || "Imported";
    let skill = config.skills.find((item) => getSearchableText(item.name) === getSearchableText(safeSkillName));

    if (!skill) {
        skill = {
            id: createId("skill_import"),
            name: safeSkillName,
            parts: [],
        };
        config.skills.push(skill);
    }

    if (!Array.isArray(skill.parts)) {
        skill.parts = [];
    }

    partDefinitions.forEach((partDefinition) => {
        const existingPart = skill.parts.find(
            (part) => getSearchableText(part.label) === getSearchableText(partDefinition.label)
        );

        if (!existingPart) {
            skill.parts.push({
                id: createId("part"),
                label: partDefinition.label,
                maxQuestions: partDefinition.maxQuestions,
                maxPoints: partDefinition.maxPoints,
            });
        }
    });

    if (!skill.parts.length) {
        skill.parts.push({ id: createId("part"), label: "Part 1", maxQuestions: 1, maxPoints: 1 });
    }

    return skill;
}

function findOrCreateTestFromImport(config, testName) {
    const safeTestName = normalizeName(testName) || "Bài kiểm tra 1";
    let test = config.tests.find((item) => getSearchableText(item.name) === getSearchableText(safeTestName));

    if (!test) {
        test = makeTest(safeTestName);
        config.tests.push(test);
        config.tests.sort((a, b) => collator.compare(a.name, b.name));
    }

    return test;
}

function getPartIdByLabel(skill, label) {
    const part = skill.parts.find((item) => getSearchableText(item.label) === getSearchableText(label));
    return part?.id || "";
}

function upsertImportedRecord(recordKey, record) {
    if (!Array.isArray(state.data.records[recordKey])) {
        state.data.records[recordKey] = [];
    }

    const bucket = state.data.records[recordKey];
    const duplicateIndex = bucket.findIndex(
        (item) =>
            getSearchableText(item.fullName) === getSearchableText(record.fullName) &&
            String(item.semester || "I") === String(record.semester || "I") &&
            (item.testId === record.testId || getSearchableText(item.testName || "") === getSearchableText(record.testName || ""))
    );

    if (duplicateIndex !== -1) {
        record.id = bucket[duplicateIndex].id || record.id;
        bucket[duplicateIndex] = { ...bucket[duplicateIndex], ...record };
        return "updated";
    }

    bucket.push(record);
    return "added";
}

function importSheetRowsFromExcel(sheet) {
    if (normalizeHeaderText(sheet.name) === "static") {
        return { added: 0, updated: 0, firstSelection: null };
    }

    const headerIndex = findHeaderIndex(sheet.rows);
    if (headerIndex === -1) {
        return { added: 0, updated: 0, firstSelection: null };
    }

    const header = sheet.rows[headerIndex];
    const dataRows = sheet.rows.slice(headerIndex + 1);
    const indexes = getExcelColumnIndexes(header);
    const partDefinitions = buildPartDefinitionsFromExcel(header, dataRows);

    if (indexes.fullName === -1 || indexes.total === -1 || !partDefinitions.length) {
        return { added: 0, updated: 0, firstSelection: null };
    }

    let added = 0;
    let updated = 0;
    let firstSelection = null;

    dataRows.forEach((row) => {
        const fullName = normalizeName(row[indexes.fullName]);
        if (!fullName) return;

        const school = findOrCreateSchoolFromImport(indexes.school === -1 ? "" : row[indexes.school]);
        const importedClass = ensureImportedClassConfig(
            school,
            indexes.grade === -1 ? "6" : row[indexes.grade],
            indexes.className === -1 ? "" : row[indexes.className]
        );
        const skill = findOrCreateSkillFromImport(
            importedClass.config,
            indexes.skill === -1 ? sheet.name : row[indexes.skill],
            partDefinitions
        );
        const test = findOrCreateTestFromImport(
            importedClass.config,
            indexes.test === -1 ? "Bài kiểm tra 1" : row[indexes.test]
        );
        const semester = indexes.semester === -1 ? "I" : parseSemesterFromExcel(row[indexes.semester]);

        const scores = {};
        partDefinitions.forEach((partDefinition) => {
            const partId = getPartIdByLabel(skill, partDefinition.label);
            if (partId) scores[partId] = parseScoreValue(row[partDefinition.index]);
        });

        const totalFromFile = indexes.total === -1 ? 0 : parseScoreValue(row[indexes.total]);
        const totalFromParts = Object.values(scores).reduce((sum, score) => sum + Number(score || 0), 0);
        const record = {
            id: createId("student"),
            fullName,
            schoolId: school.id,
            schoolName: school.name,
            grade: importedClass.grade,
            className: importedClass.className,
            skillId: skill.id,
            skillName: skill.name,
            testId: test.id,
            testName: test.name,
            semester,
            answers: {},
            scores,
            total: Number((totalFromFile || totalFromParts).toFixed(2)),
            scoreMode: "manual",
            importedFromExcel: true,
            updatedAt: new Date().toISOString(),
        };

        const classKey = getClassKey(school.id, importedClass.grade, importedClass.className);
        const recordKey = getRecordKey(classKey, skill.id);
        const result = upsertImportedRecord(recordKey, record);

        if (result === "updated") updated += 1;
        else added += 1;

        if (!firstSelection) {
            firstSelection = {
                schoolId: school.id,
                grade: importedClass.grade,
                className: importedClass.className,
                skillId: skill.id,
                testId: test.id,
                semester,
            };
        }
    });

    return { added, updated, firstSelection };
}

async function importWorkbookFromExcel(file) {
    const arrayBuffer = await file.arrayBuffer();
    const entries = await unzipXlsxEntries(arrayBuffer);
    const sheets = parseWorkbookSheets(entries);

    let added = 0;
    let updated = 0;
    let firstSelection = null;

    sheets.forEach((sheet) => {
        const result = importSheetRowsFromExcel(sheet);
        added += result.added;
        updated += result.updated;
        if (!firstSelection && result.firstSelection) firstSelection = result.firstSelection;
    });

    if (!added && !updated) {
        throw new Error("Không tìm thấy bảng điểm đúng format export của app trong file Excel này.");
    }

    if (firstSelection) {
        state.selectedSchoolId = firstSelection.schoolId;
        state.selectedGrade = firstSelection.grade;
        state.selectedClass = firstSelection.className;
        state.selectedSkillId = firstSelection.skillId;
        state.selectedTestId = firstSelection.testId;
        state.selectedSemester = firstSelection.semester;
    }

    ensureValidSelection();
    saveState();
    resetForm(false);
    renderAll();

    return { added, updated };
}

async function handleImportExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
        showToast("Vui lòng chọn file Excel định dạng .xlsx.");
        return;
    }

    const shouldImport = window.confirm(
        "Nhập Excel sẽ thêm dữ liệu vào app. Nếu trùng học sinh trong cùng bài làm, học kỳ và kỹ năng thì app sẽ cập nhật dòng cũ. Bạn muốn tiếp tục?"
    );
    if (!shouldImport) return;

    try {
        showToast("Đang nhập Excel...");
        const result = await importWorkbookFromExcel(file);
        showToast(`Đã nhập Excel: thêm ${result.added}, cập nhật ${result.updated} học sinh.`);
    } catch (error) {
        console.error(error);
        showToast(error.message || "Không thể nhập file Excel này.");
    }
}


function getTrashTypeLabel(item) {
    if (item.entityType === "student-record") return "Điểm học sinh";
    if (item.entityType === "class-metadata") return "Lớp";
    if (item.entityType === "test-metadata") return "Bài làm";
    return "Metadata";
}

function isTrashItemVisible(item) {
    const typeFilter = elements.restoreTypeFilter?.value || "all";
    if (typeFilter === "student-record" && item.entityType !== "student-record") return false;
    if (typeFilter === "metadata" && item.entityType === "student-record") return false;

    const keyword = getSearchableText(elements.restoreSearchInput?.value || "");
    if (!keyword) return true;
    const context = item.context || {};
    const haystack = getSearchableText([
        item.entityType,
        item.reason,
        context.schoolName,
        context.grade,
        context.className,
        context.skillName,
        context.semester,
        context.testName,
        context.fullName,
        context.total,
    ].filter(Boolean).join(" "));
    return haystack.includes(keyword);
}

function renderTrashTable() {
    const visibleItems = restoreCenterTrashItems.filter(isTrashItemVisible);
    elements.trashCountBadge.textContent = `${visibleItems.length} mục`;

    if (!visibleItems.length) {
        elements.trashTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Không có dữ liệu phù hợp để restore.</td></tr>';
        return;
    }

    elements.trashTableBody.innerHTML = visibleItems.map((item) => {
        const context = item.context || {};
        const isRecord = item.entityType === "student-record";
        const typeClass = isRecord ? "record" : "metadata";
        return `
            <tr>
                <td class="numeric"><input type="checkbox" class="trash-select" value="${escapeHtml(item.trashId)}" /></td>
                <td>${escapeHtml(formatDateTime(item.deletedAt))}</td>
                <td><span class="type-pill ${typeClass}">${escapeHtml(getTrashTypeLabel(item))}</span></td>
                <td>
                    <div class="restore-context">
                        <span class="context-main">${escapeHtml(context.schoolName || "")}</span>
                        <span class="context-sub">${escapeHtml(getContextText(context))}</span>
                    </div>
                </td>
                <td>${escapeHtml(context.fullName || "—")}</td>
                <td class="numeric">${context.total !== undefined && context.total !== null ? formatScore(context.total) : "—"}</td>
                <td>${escapeHtml(item.reason || "")}</td>
            </tr>
        `;
    }).join("");
}

function formatBytes(bytes) {
    const num = Number(bytes || 0);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / 1024 / 1024).toFixed(1)} MB`;
}

function renderBackupList() {
    elements.backupCountBadge.textContent = `${restoreCenterBackups.length} bản`;
    if (!restoreCenterBackups.length) {
        elements.backupList.innerHTML = '<div class="empty-state">Chưa có backup nào.</div>';
        return;
    }

    elements.backupList.innerHTML = restoreCenterBackups.map((backup) => `
        <div class="backup-item">
            <div>
                <div class="backup-title">${escapeHtml(backup.name)}</div>
                <div class="backup-meta">${escapeHtml(backup.type)} · ${escapeHtml(formatDateTime(backup.createdAt))} · ${escapeHtml(formatBytes(backup.sizeBytes))}</div>
            </div>
            <button type="button" class="icon-btn" data-backup-id="${escapeHtml(backup.id)}">Restore full</button>
        </div>
    `).join("");
}

async function loadRestoreCenterData() {
    try {
        const [trashResult, backupsResult] = await Promise.all([
            apiRequest("/api/trash"),
            apiRequest("/api/backups"),
        ]);
        restoreCenterTrashItems = Array.isArray(trashResult.items) ? trashResult.items : [];
        restoreCenterBackups = Array.isArray(backupsResult.backups) ? backupsResult.backups : [];
        renderTrashTable();
        renderBackupList();
        if (elements.restoreDataInfo) {
            elements.restoreDataInfo.textContent = "Chọn từng dòng hoặc lọc theo học sinh/lớp/bài làm để restore linh hoạt.";
        }
    } catch (error) {
        console.error(error);
        showToast("Không tải được Backup / Restore Center. Hãy kiểm tra Local JSON Server.");
    }
}

async function openRestoreCenter() {
    if (!state.storageAvailable) {
        showToast("Cần chạy Local JSON Server để dùng Backup / Restore.");
        return;
    }
    elements.restoreModal.classList.remove("hidden");
    elements.restoreModal.setAttribute("aria-hidden", "false");
    await loadRestoreCenterData();
}

function closeRestoreCenter() {
    elements.restoreModal.classList.add("hidden");
    elements.restoreModal.setAttribute("aria-hidden", "true");
}

function getSelectedTrashIds() {
    return Array.from(elements.trashTableBody.querySelectorAll(".trash-select:checked")).map((checkbox) => checkbox.value);
}

function selectVisibleTrashItems() {
    elements.trashTableBody.querySelectorAll(".trash-select").forEach((checkbox) => {
        checkbox.checked = true;
    });
}

function clearTrashSelection() {
    elements.trashTableBody.querySelectorAll(".trash-select").forEach((checkbox) => {
        checkbox.checked = false;
    });
}

async function restoreSelectedTrashItems() {
    const ids = getSelectedTrashIds();
    if (!ids.length) {
        showToast("Hãy chọn ít nhất một dữ liệu cần restore.");
        return;
    }

    const selectedItems = restoreCenterTrashItems.filter((item) => ids.includes(item.trashId));
    const ok = window.confirm(`Restore ${selectedItems.length} mục đã chọn?`);
    if (!ok) return;

    let restored = 0;
    selectedItems.forEach((item) => {
        if (item.entityType === "student-record") {
            if (restoreRecordTrashItem(item)) restored += 1;
        } else if (restoreMetadataTrashItem(item)) {
            restored += 1;
        }
    });

    ensureTestsFromRecords();
    ensureValidSelection();
    saveState();
    await flushPendingSave("restore selected trash");

    try {
        await apiRequest("/api/trash/mark-restored", {
            method: "POST",
            body: JSON.stringify({ trashIds: ids }),
        });
    } catch (error) {
        console.warn(error.message);
    }

    resetForm(false);
    renderAll();
    await loadRestoreCenterData();
    showToast(`Đã restore ${restored} mục.`);
}

async function createManualBackup() {
    try {
        await flushPendingSave("manual backup preparation");
        await apiRequest("/api/backups/manual", {
            method: "POST",
            body: JSON.stringify({ reason: "manual backup from app" }),
        });
        await loadRestoreCenterData();
        showToast("Đã tạo backup thủ công.");
    } catch (error) {
        console.error(error);
        showToast("Không tạo được backup thủ công.");
    }
}

async function restoreFullBackup(backupId) {
    const backup = restoreCenterBackups.find((item) => item.id === backupId);
    if (!backup) return;
    const ok = window.confirm(
        `Restore toàn bộ dữ liệu từ backup này?\n\n${backup.name}\n${formatDateTime(backup.createdAt)}\n\nDữ liệu hiện tại sẽ được backup thêm trước khi restore.`
    );
    if (!ok) return;

    try {
        await apiRequest("/api/backups/restore", {
            method: "POST",
            body: JSON.stringify({ id: backupId }),
        });
        await loadState();
        resetForm(false);
        renderAll();
        await loadRestoreCenterData();
        showToast("Đã restore toàn bộ dữ liệu từ backup.");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Không restore được backup.");
    }
}

function bindEvents() {
    elements.schoolSelect.addEventListener("change", (event) => {
        state.selectedSchoolId = event.target.value;
        state.selectedClass = "";
        state.selectedSkillId = "";
        state.selectedTestId = "";
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.gradeSelect.addEventListener("change", (event) => {
        state.selectedGrade = event.target.value;
        state.selectedClass = "";
        state.selectedSkillId = "";
        state.selectedTestId = "";
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.classSelect.addEventListener("change", (event) => {
        state.selectedClass = event.target.value;
        state.selectedSkillId = "";
        state.selectedTestId = "";
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.skillSelect.addEventListener("change", (event) => {
        state.selectedSkillId = event.target.value;
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.semesterSelect.addEventListener("change", (event) => {
        state.selectedSemester = event.target.value;
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.testSelect.addEventListener("change", (event) => {
        state.selectedTestId = event.target.value;
        ensureValidSelection();
        saveState();
        resetForm(false);
        renderAll();
    });

    elements.addSchoolBtn.addEventListener("click", addSchool);
    elements.deleteSchoolBtn.addEventListener("click", deleteSchool);
    elements.addGradeBtn.addEventListener("click", addGrade);
    elements.editGradeBtn.addEventListener("click", editGrade);
    elements.deleteGradeBtn.addEventListener("click", deleteGrade);
    elements.addClassBtn.addEventListener("click", addClass);
    elements.deleteClassBtn.addEventListener("click", deleteClass);
    elements.addSkillBtn.addEventListener("click", addSkill);
    elements.deleteSkillBtn.addEventListener("click", deleteSkill);
    elements.addTestBtn.addEventListener("click", addTest);
    elements.editTestBtn.addEventListener("click", editTest);
    elements.deleteTestBtn.addEventListener("click", deleteTest);
    elements.addPartBtn.addEventListener("click", addPart);

    elements.openRestoreCenterBtn.addEventListener("click", openRestoreCenter);
    elements.closeRestoreCenterBtn.addEventListener("click", closeRestoreCenter);
    elements.refreshRestoreCenterBtn.addEventListener("click", loadRestoreCenterData);
    elements.createManualBackupBtn.addEventListener("click", createManualBackup);
    elements.selectVisibleTrashBtn.addEventListener("click", selectVisibleTrashItems);
    elements.clearTrashSelectionBtn.addEventListener("click", clearTrashSelection);
    elements.restoreSelectedTrashBtn.addEventListener("click", restoreSelectedTrashItems);
    elements.restoreSearchInput.addEventListener("input", renderTrashTable);
    elements.restoreTypeFilter.addEventListener("change", renderTrashTable);
    elements.backupList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-backup-id]");
        if (!button) return;
        restoreFullBackup(button.dataset.backupId);
    });
    elements.restoreModal.addEventListener("click", (event) => {
        if (event.target === elements.restoreModal) closeRestoreCenter();
    });

    elements.studentName.addEventListener("input", scheduleDraftSave);

    elements.partScoreList.addEventListener("input", (event) => {
        if (event.target.matches("input[data-score-part-id]")) {
            updateComputedScores();
            scheduleDraftSave();
        }
    });

    elements.partScoreList.addEventListener("blur", (event) => {
        if (!event.target.matches("input[data-score-part-id]")) return;
        const partId = event.target.dataset.scorePartId;
        const part = getSelectedSkill()?.parts.find((item) => item.id === partId);
        if (!part) return;
        event.target.value = clampInteger(event.target.value, 0, part.maxQuestions);
        updateComputedScores();
    }, true);

    elements.partsConfigList.addEventListener("click", handlePartConfigClick);
    elements.partsConfigList.addEventListener("change", (event) => {
        if (event.target.matches("input[data-part-field]")) {
            updatePartConfig(event.target);
        }
    });

    elements.scoreForm.addEventListener("submit", upsertRecord);
    elements.resetFormBtn.addEventListener("click", () => resetForm());
    elements.clearSkillBtn.addEventListener("click", clearCurrentSkill);
    elements.scoreTableBody.addEventListener("click", handleTableAction);

    elements.exportCurrentSkillBtn.addEventListener("click", exportCurrentSkill);
    elements.exportCurrentClassBtn.addEventListener("click", exportCurrentClass);
    elements.exportAllBtn.addEventListener("click", exportAllData);
    elements.importExcelInput.addEventListener("change", handleImportExcel);

    elements.sortModeSelect.addEventListener("change", (event) => {
        state.sortMode = event.target.value;
        saveState();
        renderTable();
    });

    elements.searchInput.addEventListener("input", (event) => {
        state.searchText = event.target.value;
        renderTable();
    });

    window.addEventListener("beforeunload", () => {
        if (saveTimer) {
            const payload = JSON.stringify({
                data: state.data,
                settings: getCurrentSettingsSnapshot(),
                reason: "beforeunload",
            });
            if (navigator.sendBeacon && state.storageAvailable) {
                navigator.sendBeacon(`${LOCAL_SERVER_BASE}/api/state`, new Blob([payload], { type: "application/json" }));
            }
        }
    });

    elements.scoreForm.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        if (!event.target.matches("input")) return;
        event.preventDefault();

        const focusables = [
            elements.studentName,
            ...Array.from(elements.partScoreList.querySelectorAll("input[data-score-part-id]")),
            elements.saveBtn,
        ].filter((item) => item && !item.disabled);

        const currentIndex = focusables.indexOf(event.target);
        const next = focusables[currentIndex + 1];

        if (next) {
            next.focus();
            if (typeof next.select === "function") next.select();
        } else {
            elements.scoreForm.requestSubmit();
        }
    });
}

async function init() {
    await loadState();
    updateStorageHint();
    elements.sortModeSelect.value = state.sortMode;
    bindEvents();
    renderAll();
    await restoreDraftIfAvailable();
}

init();
