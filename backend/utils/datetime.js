const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
    const end = new Date();
    const start = new Date(); 

    start.setDate(end.getDate() - 30);

    return {
        startDate: formatDateOnly(start),
        endDate: formatDateOnly(end)
    };
};

const parseRange = (query) => {
	const defaults = getDefaultRange();
	const startDate = query.startDate || defaults.startDate;
	const endDate = query.endDate || defaults.endDate;
	return { startDate, endDate };
};

export { parseRange };
