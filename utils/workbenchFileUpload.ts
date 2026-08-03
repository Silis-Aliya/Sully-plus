export const WORKBENCH_TEXT_FILE_MAX_BYTES = 64 * 1024;
export const WORKBENCH_TEXT_FILE_BATCH_MAX_BYTES = 128 * 1024;
export const WORKBENCH_TEXT_FILE_MAX_COUNT = 4;

export const WORKBENCH_TEXT_FILE_ACCEPT = [
    'text/*',
    '.md', '.markdown', '.txt', '.json', '.jsonc',
    '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
    '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env',
    '.py', '.pyi', '.java', '.kt', '.kts', '.c', '.cc', '.cpp', '.cxx',
    '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.sql', '.graphql', '.gql',
    '.vue', '.svelte', '.lua', '.r', '.gradle', '.properties',
].join(',');

const TEXT_FILE_EXTENSIONS = new Set(
    WORKBENCH_TEXT_FILE_ACCEPT.split(',').filter(value => value.startsWith('.')),
);
const EXTENSIONLESS_TEXT_NAMES = new Set([
    'dockerfile', 'makefile', 'readme', 'license', 'changelog',
    '.gitignore', '.gitattributes', '.npmrc', '.editorconfig',
]);

export interface PreparedWorkbenchTextFile {
    name: string;
    mimeType: string;
    size: number;
    textContent: string;
    preview: string;
}

const fileExtension = (name: string): string => {
    const normalized = name.trim().toLowerCase();
    const dot = normalized.lastIndexOf('.');
    return dot >= 0 ? normalized.slice(dot) : '';
};

export const isWorkbenchTextFile = (file: Pick<File, 'name' | 'type'>): boolean => {
    const name = file.name.trim().toLowerCase();
    return file.type.toLowerCase().startsWith('text/')
        || TEXT_FILE_EXTENSIONS.has(fileExtension(name))
        || EXTENSIONLESS_TEXT_NAMES.has(name);
};

export const prepareWorkbenchTextFiles = async (
    input: File[] | FileList,
): Promise<PreparedWorkbenchTextFile[]> => {
    const files = Array.from(input);
    if (!files.length) return [];
    if (files.length > WORKBENCH_TEXT_FILE_MAX_COUNT) {
        throw new Error(`一次最多上传 ${WORKBENCH_TEXT_FILE_MAX_COUNT} 个文本文件`);
    }

    let totalBytes = 0;
    const prepared: PreparedWorkbenchTextFile[] = [];
    for (const file of files) {
        if (!isWorkbenchTextFile(file)) {
            throw new Error(`“${file.name}”不是支持的文本或代码文件`);
        }
        if (file.size > WORKBENCH_TEXT_FILE_MAX_BYTES) {
            throw new Error(`“${file.name}”超过 64 KB，请拆分后再上传`);
        }
        totalBytes += file.size;
        if (totalBytes > WORKBENCH_TEXT_FILE_BATCH_MAX_BYTES) {
            throw new Error('本次文件总大小超过 128 KB，请分批上传');
        }

        const textContent = (await file.text()).replace(/^\uFEFF/, '');
        if (textContent.includes('\0')) {
            throw new Error(`“${file.name}”看起来是二进制文件，无法作为文本读取`);
        }
        prepared.push({
            name: file.name || '未命名文本文件',
            mimeType: file.type || 'text/plain',
            size: file.size,
            textContent,
            preview: textContent.slice(0, 1200),
        });
    }
    return prepared;
};
