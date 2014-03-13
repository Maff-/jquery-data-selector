/**
 * @author Ruud Bijnen
 */
(function ($) {

    var DataSelectorLoader = function (elm, options) {
        this.$element = elm;
        this.options = options;
        this.params = options.params || {};

        this.init();
    };

    DataSelectorLoader.DEFAULTS = {
        namespace: 'wf.loader',
        searchParam: 'search',
        searchDelay: 250
    };

    DataSelectorLoader.prototype.init = function () {
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

        this.paramsUpdated();
    };

    DataSelectorLoader.prototype.paramsUpdated = function () {
        this.load();
    };

    DataSelectorLoader.prototype.load = function () {
        var dsl = this;
        var opts = this.options;
        var elm = this.$element;

        elm.addClass('loading');
        opts.beforeLoad.call(elm);

        $.ajax({
            type: opts.type,
            url: opts.url,
            data: dsl.params,
            success: function (data, textStatus, jqXHR) {

                if (typeof data == 'object' && data[opts.dataIndex] !== undefined) {
                    dsl.objResponseHandler(data[opts.dataIndex]);
                } else {
                    dsl.textResponseHandler(data);
                }

                opts.onSuccess.call(elm, data, textStatus, jqXHR);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                opts.onError.call(elm, jqXHR, textStatus, errorThrown);
            }
        }).always(function () {
            elm.removeClass('loading');
            opts.afterLoad.call(elm);
        });
    };

    DataSelectorLoader.prototype.objResponseHandler = function (data) {
        var dsl = this;
        var elm = this.$element;
        elm.empty();
        $.each(data, function (i, obj) {
            var objHtml = dsl.objRenderer(obj);
            elm.append(objHtml);
        });
    };

    DataSelectorLoader.prototype.textResponseHandler = function (data) {
        this.$element.html(this.textRenderer(data));
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
            var opts = $.extend({}, $.fn.dsLoader.defaults, options);

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
        url: undefined,
        deferLoad: false,
        type: 'post',
        dataIndex: 'data',
        selectorSelector: '[data-selector]',
        selectorValueSelector: 'a[data-value]',
        contentContainer: undefined,
        paginationContainer: undefined,

        objHandler: undefined,
        textHandler: undefined,
        objRenderer: undefined,
        textRenderer: undefined,
        paramsUpdated: undefined,

        beforeLoad: function () {
        },
        afterLoad: function () {
        },
        onSuccess: function () {
        },
        onError: function () {
        }

    };

    $.fn.getLoader = function () {
        var $this = $(this);
        return $this.data(DataSelectorLoader.DEFAULTS.namespace);
    }

})(jQuery);