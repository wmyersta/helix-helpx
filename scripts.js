const config = {
    lazyMargin: '1200px 0px',
    blocks: {
        'header': {
            location: '/blocks/header/',
            styles: 'header.css',
            scripts: 'header.js',
        },
        'footer': {
            location: '/blocks/footer/',
            styles: 'footer.css',
            scripts: 'footer.js',
        },
        'a[href^="https://www.youtube.com"]': {
            lazy: true,
            location: '/blocks/embed/',
            styles: 'youtube.css',
            scripts: 'youtube.js',
        },
        '.social-links': {
            lazy: true,
            location: '/blocks/social/',
            styles: 'social.css',
        },
        '.aside': {
            lazy: true,
            location: '/blocks/aside/',
            styles: 'aside.css',
        },
        '.cta-cards': {
            lazy: true,
            location: '/blocks/cta-cards/',
            styles: 'cta-cards.css',
        },
    },
    templates: {
        'DEI Resource': {

        }
    }
};

const getDomain = () => {
    const domain = `${protocol}//${hostname}`;
    return port ? `${domain}:${port}` : domain;
};
const currentDomain = getDomain();

const setDomain = (element) => {
    const anchors = element.getElementsByTagName('a');
    Array.from(anchors).forEach((anchor) => {
        const { href } = anchor;
        if (href.includes(LIVE_DOMAIN)) {
            anchor.href = href.replace(LIVE_DOMAIN, currentDomain);
        }
    });
};

const getMetadata = (name) => {
    const meta = document.head.querySelector(`meta[name="${name}"]`);
    return meta && meta.content;
};

const addStyle = (location, loadEvent) => {
    const element = document.createElement('link');
    element.setAttribute('rel', 'stylesheet');
    element.setAttribute('href', location);
    if (loadEvent) {
        element.addEventListener('load', loadEvent);
    }
    document.querySelector('head').appendChild(element);
};

const loadTemplate = (config) => {
    const template = getMetadata('template');
    const isLoaded = () => {
        document.body.classList.add('is-Loaded');
    };
    if (template) {
        const templateConf = config.templates[template] || {};
        if (templateConf.class) {
            document.body.classList.add(templateConf.class);
        }
        if (templateConf.styles) {
            addStyle(`${templateConf.location}${templateConf.styles}`, isLoaded);
        } else {
            isLoaded();
        }
    } else {
        isLoaded();
    }
};

const loadBlocks = (config, suppliedEl) => {
    const parentEl = suppliedEl || document;

    const initJs = async (element, block) => {
        // If the block scripts haven't been loaded, load them.
        if (block.scripts) {
            if (!block.module) {
                // eslint-disable-next-line no-param-reassign
                block.module = await import(`${block.location}${block.scripts}`);
            }
            // If this block type has scripts and they're already imported
            if (block.module) {
                block.module.default(element, { addStyle, setDomain });
            }
        }
        element.classList.add('is-Loaded');
        return true;
    };

    /**
     * Unlazy each type of block
     * @param {HTMLElement} element
     */
    const loadElement = async (element) => {
        const { blockSelect } = element.dataset;
        const block = config.blocks[blockSelect];

        if (!block.loaded && block.styles) {
            addStyle(`${block.location}${block.styles}`);
        }

        block.loaded = initJs(element, block);
    };

    /**
     * Iterate through all entries to determine if they are intersecting.
     * @param {IntersectionObserverEntry} entries
     * @param {IntersectionObserver} observer
     */
    const onIntersection = (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                loadElement(entry.target);
            }
        });
    };

    /**
     * Clean up variant classes
     * Ex: marquee--small--contained- -> marquee small contained
     * @param {HTMLElement} parent
     */
    const cleanVariations = (parent) => {
        const variantBlocks = parent.querySelectorAll('[class$="-"]');
        variantBlocks.forEach((variant) => {
            const { className } = variant;
            const classNameClipped = className.slice(0, -1);
            variant.classList.remove(className);
            const classNames = classNameClipped.split('--');
            variant.classList.add(...classNames);
        });
    };

    /**
     * Load blocks
     * @param {HTMLElement} element
     */
    const init = (element) => {
        const isDoc = element instanceof HTMLDocument;
        const parent = isDoc ? document.querySelector('body') : element;
        cleanVariations(parent);

        const options = { rootMargin: config.lazyMargin || '1000px 0px' };
        const observer = new IntersectionObserver(onIntersection, options);

        Object.keys(config.blocks).forEach((block) => {
            const elements = parent.querySelectorAll(block);
            elements.forEach((el) => {
                el.setAttribute('data-block-select', block);
                if (config.blocks[block].lazy) {
                    observer.observe(el);
                } else {
                    loadElement(el);
                }
            });
        });
    };

    const fetchFragment = async (path) => {
        const resp = await fetch(`${path}.plain.html`);
        if (resp.ok) {
            return resp.text();
        }
        return null;
    };

    const loadFragment = async (fragmentEl) => {
        const path = fragmentEl.querySelector('div > div').textContent;
        const html = await fetchFragment(path);
        if (html) {
            fragmentEl.insertAdjacentHTML('beforeend', html);
            fragmentEl.querySelector('div').remove();
            fragmentEl.classList.add('is-Visible');
            setDomain(fragmentEl);
            init(fragmentEl);
        }
    };

    /**
     * Add fragment to the list of blocks
     */
    // eslint-disable-next-line no-param-reassign
    config.blocks['.fragment'] = {
        loaded: true,
        scripts: {},
        module: {
            default: loadFragment,
        },
    };

    init(parentEl);
};

const insertGtm = () => {
    console.log('gtm');
    const gtm = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-K4JC9TV');`;

    const element = document.createElement('script');
    element.innerHTML = gtm;
    document.querySelector('head').appendChild(element);
};

const postLCP = () => {
    loadTemplate(config);
    loadBlocks(config);
    setTimeout(insertGtm, 3000);
};

const setLCPTrigger = () => {
    const lcpCandidate = document.querySelector('main > div:first-of-type > div:first-of-type img');
    if (lcpCandidate) {
        if (lcpCandidate.complete) {
            postLCP();
        } else {
            lcpCandidate.addEventListener('load', () => {
                postLCP();
            });
            lcpCandidate.addEventListener('error', () => {
                postLCP();
            });
        }
    } else {
        postLCP();
    }
};
setDomain(document);
setLCPTrigger();
