export const PREDEFINED_TAGS = [
    'Scholarship',
    'Internship',
    'Medical',
    'Building',
    'Finance',
    'Academics',
    'Transporation',
    'Administration',
    'Facility',
    'Organised Events',
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