export interface Question {
    q: string;
    choices: string[];
    answer: number;
    explain: string;
}

export interface Unit {
    id: string;
    title: string;
    short: string;
    icon: string;
    color: string;
    questions: Question[];
}
