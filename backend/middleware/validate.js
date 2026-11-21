/**
 * Validate request middleware
 * @param {import('zod').ZodSchema} schema 
 * @returns {import('express').RequestHandler}
 */
export const validateRequest = (schema) => (req, res, next) => {
    try {
        // 1. Parse the request components
        const result = schema.parse({
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params,
        });

        // 2. Update request objects with validated/transformed data
        // We use Object.assign or direct assignment depending on the property
        if (result.body) req.body = result.body;
        if (result.params) req.params = result.params;
        if (result.headers) req.headers = { ...req.headers, ...result.headers };

        if (result.query) {
            // Some versions of Express make req.query read-only, 
            // so we redefine it to be safe.
            Object.defineProperty(req, 'query', {
                value: result.query,
                writable: true,
                configurable: true,
                enumerable: true
            });
        }

        return next();
    } catch (error) {
        // 3. Fix: 'result' is not available here, use 'error'
        console.error("Validation Error:", error.errors || error.message);

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors || error.message
        });
    }
};