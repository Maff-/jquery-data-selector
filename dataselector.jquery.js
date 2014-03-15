/**
 * @author Ruud Bijnen
 */
(function ($) {

    var DataSelectorLoader = function (elm, options) {
        this.$element = elm;
        this.options = options;
        this.params = options.params || {};

        this.limit = this.params[this.options.limitParam] || 1;
        this.start = this.params[this.options.startParam] || 0;
        this.currentPage = (this.limit == 0) ? 1 : (this.start / this.limit) + 1;
        this.pages = this.currentPage;
        this.pageLength = this.limit;

        this.contentElm = null;
        this.paginationElm = null;

        this.initContainers();
        this.initListeners();

        this.options.afterInit.call(elm);
    };

    DataSelectorLoader.DEFAULTS = {
        namespace: 'rb.loader',
        searchParam: 'search',
        searchDelay: 250,
        contentContainerClass: 'dsl-content',
        paginationContainerClass: 'dsl-pagination',
        overlayClass: 'dsl-overlay'
    };

    DataSelectorLoader.prototype.initListeners = function () {
        var dsl = this;
        var opts = this.options;

        $(opts.selectorSelector).on('click', opts.selectorValueSelector, function (e) {
            e.preventDefault();
            var optionElm = $(e.target);
            var value = optionElm.data('value');
            var selector = optionElm.closest(opts.selectorSelector);
            var stateElm = dsl.getStateElement(optionElm);
            var name = selector.data('selector');
            var multiple = selector.data('multiple') !== undefined;


            if (!multiple) {
                var prevState = stateElm.hasClass('active');
                selector.find(opts.selectorValueSelector).each(function () {
                    dsl.getStateElement(this).removeClass('active');
                });
                if (prevState == false) stateElm.addClass('active');
            } else {
                stateElm.toggleClass('active');
            }
            var state = stateElm.hasClass('active');

            dsl.setParam(name, value, state, multiple);
        });

        if (this.paginationElm) {
            $(this.paginationElm).on('click', 'a[data-start]', function(e) {
                var link = $(e.target);
                var start = link.data('start');
                dsl.setParam(opts.startParam, start, true, false);
                e.preventDefault();
            });
        }
    };

    DataSelectorLoader.prototype.initContainers = function () {
//        var dsl = this;
        var opts = this.options;

        if (opts.contentContainer === false) {
            this.contentElm = this.$element;
        } else if (typeof opts.contentContainer == 'string') {
            this.contentElm = $(opts.contentContainer);
        } else if (opts.contentContainer instanceof $) {
            this.contentElm = opts.contentContainer;
        } else {
            this.$element.empty();
            this.contentElm = this.buildContentContainer();
        }

        if (opts.pagination) {
            if (opts.paginationContainer === false) {
                this.paginationElm = this.$element;
            } else if (typeof opts.paginationContainer == 'string') {
                this.paginationElm = $(opts.paginationContainer);
            } else if (opts.paginationContainer instanceof $) {
                this.paginationElm = opts.paginationContainer;
            } else {
                this.paginationElm = this.buildPaginationContainer();
            }
        }

        if (this.contentElm != this.$element) {
            this.buildOverlay();
        }
    };

    DataSelectorLoader.prototype.buildPaginationContainer = function () {
        return $('<div>').addClass(DataSelectorLoader.DEFAULTS.paginationContainerClass).appendTo(this.$element);
    };

    DataSelectorLoader.prototype.buildContentContainer = function () {
        return $('<div>').addClass(DataSelectorLoader.DEFAULTS.contentContainerClass).appendTo(this.$element);
    };

    DataSelectorLoader.prototype.buildOverlay = function () {
        return $('<div>').addClass(DataSelectorLoader.DEFAULTS.overlayClass).appendTo(this.$element);
    };

    DataSelectorLoader.prototype.addSearch = function (input, paramName, delay) {
        var dsl = this;
        var t;
        var $input = $(input);
        paramName = paramName || DataSelectorLoader.DEFAULTS.searchParam;
        if (delay == undefined) delay = DataSelectorLoader.DEFAULTS.searchDelay;
        var prevVal = $input.val();
        $input.on('keyup', function(e) {
            if (t) clearTimeout(t);
            t = setTimeout(function () {
                var value = $(e.target).val();
                if (value != prevVal) {
                    dsl.setParam(paramName, value, true);
                }
            }, delay);
        });
    };

    DataSelectorLoader.prototype.setParam = function (name, value, state, multiple) {
        if (multiple) {
            if (this.params[name] == undefined) this.params[name] = [];
            if (state == true) {
                // add value
                this.params[name].push(value);
            } else {
                // remove value
                var i = $.inArray(value, this.params[name]);
                if (i > -1) {
                    this.params[name].splice(i, 1);
                }
            }
        } else {
            if (state == true) {
                this.params[name] = value;
            } else {
                delete this.params[name];
            }
        }

        this.limit = this.params[this.options.limitParam] || 1;
        this.start = this.params[this.options.startParam] || 0;

        this.paramsUpdated();
    };

    DataSelectorLoader.prototype.paramsUpdated = function () {
        this.load();
    };

    DataSelectorLoader.prototype.nextPage = function () {
        this.jumpPage(this.currentPage + 1);
    };

    DataSelectorLoader.prototype.prevPage = function () {
        this.jumpPage(this.currentPage - 1);
    };

    DataSelectorLoader.prototype.jumpPage = function (page) {
        var start = this.pageLength * (page - 1);
        this.setParam(this.options.startParam, start, true, false);
    };

    DataSelectorLoader.prototype.load = function () {
        var dsl = this;
        var opts = this.options;
        var elm = this.$element;

        elm.addClass('loading');
        opts.beforeLoad.call(elm);

        var ajaxOpts = {
            url: opts.url || undefined,
            type: opts.type || undefined,
            data: dsl.params,
            success: function (data, textStatus, jqXHR) {
                dsl.responseHandler.call(dsl, data, textStatus, jqXHR);
            },
            error : function (jqXHR, textStatus, errorThrown) {
                opts.onError.call(elm, jqXHR, textStatus, errorThrown);
            }
        };

        $.ajax($.extend(true, {}, ajaxOpts, opts.ajax))
        .always(function () {
            elm.removeClass('loading');
            opts.afterLoad.call(elm);
        });
    };

    DataSelectorLoader.prototype.responseHandler = function (data, textStatus, jqXHR) {
        var dsl = this;
        var opts = this.options;
        var elm = this.$element;

        if (typeof data == 'object' && data[opts.dataIndex] !== undefined) {
            dsl.objResponseHandler(data[opts.dataIndex]);
            dsl.updatePages(data);
            if (opts.pagination) {
                dsl.buildPagination();
            }
        } else {
            dsl.textResponseHandler(data);
        }

        opts.onSuccess.call(elm, data, textStatus, jqXHR);
    };

    DataSelectorLoader.prototype.objResponseHandler = function (data) {
        var dsl = this;
        var cElm = this.contentElm;

        cElm.empty();
        $.each(data, function (i, obj) {
            var objHtml = dsl.objRenderer(obj);
            cElm.append(objHtml);
        });
    };

    DataSelectorLoader.prototype.textResponseHandler = function (data) {
        this.contentElm.html(this.textRenderer(data));
    };

    DataSelectorLoader.prototype.updatePages = function (data) {
        var opts = this.options;
        if (data[opts.recordsCountIndex] == undefined) return;
        var totalRecords = data[opts.recordsCountIndex];
        this.pageLength = this.params[opts.limitParam] || data[opts.dataIndex].length;
        this.pages = Math.ceil(totalRecords / this.pageLength);
        this.currentPage = (this.start / this.pageLength) + 1;
    };

    DataSelectorLoader.prototype.buildPagination = function () {
        var paginator = $('<ul>').addClass('pagination');
        for (var i=0; i < this.pages; i++) {
            var page = i+1;
            var li = $('<li>');
            if (page == this.currentPage) {
                li.addClass('active');
            }
            var link = $('<a>').attr({href: '#', 'data-start': i * this.pageLength}).text(page);
            li.append(link);
            paginator.append(li);
        }
        this.paginationElm.html(paginator);
    };

    // the user should override this function, this is only a demo
    DataSelectorLoader.prototype.objRenderer = function (obj) {
        return JSON.stringify(obj);
    };

    DataSelectorLoader.prototype.textRenderer = function (text) {
        return text;
    };

    DataSelectorLoader.prototype.getStateElement = function (selector) {
        return $(selector).closest('li');
    };

    $.fn.dsLoader = function (options) {

        return this.each(function () {
            var $this = $(this);
            var opts = $.extend(true, {}, $.fn.dsLoader.defaults, options);

            var dsl = $this.data(DataSelectorLoader.DEFAULTS.namespace);
            if (!dsl) $this.data(DataSelectorLoader.DEFAULTS.namespace, (dsl = new DataSelectorLoader($this, opts)));

            if (opts.objHandler !== undefined) dsl.objResponseHandler = opts.objHandler;
            if (opts.textHandler !== undefined) dsl.textResponseHandler = opts.textHandler;
            if (opts.objRenderer !== undefined) dsl.objRenderer = opts.objRenderer;
            if (opts.textRenderer !== undefined) dsl.textRenderer = opts.textRenderer;

            if (opts.paramsUpdated !== undefined) dsl.paramsUpdated = opts.paramsUpdated;

            if (!opts.deferLoad) {
                dsl.load();
            }

            $this.getLoader = function () {
                return dsl;
            }
        });
    };

    $.fn.dsLoader.defaults = {
        ajax: {
            url: undefined,
            type: 'post'
        },
        deferLoad: false,
        pagination: true,

        dataIndex: 'data',
        recordsCountIndex: 'recordsFiltered',

        limitParam: 'length',
        startParam: 'start',

        selectorSelector: '[data-selector]',
        selectorValueSelector: 'a[data-value]',
        contentContainer: undefined,
        paginationContainer: undefined,

        objHandler: undefined,
        textHandler: undefined,
        objRenderer: undefined,
        textRenderer: undefined,
        paramsUpdated: undefined,

        beforeLoad: function () {},
        afterLoad: function () {},
        afterInit: function () {},
        onSuccess: function () {},
        onError: function () {}

    };

    $.fn.getLoader = function () {
        var $this = $(this);
        return $this.data(DataSelectorLoader.DEFAULTS.namespace);
    }

})(jQuery);