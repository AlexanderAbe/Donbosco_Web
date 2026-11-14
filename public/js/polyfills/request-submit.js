(() => {
    const formPrototype = window.HTMLFormElement?.prototype;
    if (!formPrototype || typeof formPrototype.requestSubmit === 'function') return;

    Object.defineProperty(formPrototype, 'requestSubmit', {
        configurable: true,
        writable: true,
        value(submitter) {
            if (submitter !== undefined) {
                const isSubmitButton = (
                    submitter instanceof window.HTMLButtonElement && submitter.type === 'submit'
                ) || (
                    submitter instanceof window.HTMLInputElement
                    && ['submit', 'image'].includes(submitter.type)
                );
                if (!isSubmitButton) {
                    throw new TypeError('The specified element is not a submit button.');
                }
                if (submitter.form !== this) {
                    throw new window.DOMException(
                        'The submit button does not belong to this form.',
                        'NotFoundError'
                    );
                }
                submitter.click();
                return;
            }

            const temporarySubmitter = document.createElement('button');
            temporarySubmitter.type = 'submit';
            temporarySubmitter.hidden = true;
            this.appendChild(temporarySubmitter);
            try {
                temporarySubmitter.click();
            } finally {
                this.removeChild(temporarySubmitter);
            }
        }
    });
})();
