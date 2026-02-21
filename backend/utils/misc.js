export const PREDEFINED_TAGS = [
    'Internship',
    'Medical',
    'Finance',
    'Academics',
    'Transportation',
    'Facility',
    'Organised Events',
    'Administration',
];
let _commaSeparatedTags = "";
for(const tag of PREDEFINED_TAGS)
    _commaSeparatedTags += (tag + ', ')

const FIRST_CHARACTER = 0;
const SEMICOLON_WITH_SPACE = 2;
export const commaSeparatedTags = _commaSeparatedTags.substr(
    FIRST_CHARACTER, 
    _commaSeparatedTags.length - SEMICOLON_WITH_SPACE
)