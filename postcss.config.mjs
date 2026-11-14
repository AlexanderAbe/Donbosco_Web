import tailwindcss from '@tailwindcss/postcss';
import postcssPresetEnv from 'postcss-preset-env';

export default {
    plugins: [
        tailwindcss(),
        postcssPresetEnv({
            stage: false,
            features: {
                'media-query-ranges': { preserve: false },
                'nesting-rules': { preserve: false },
            },
        }),
    ],
};
