var Bootstrap3Typeahead;
(function (Bootstrap3Typeahead) {
    var Typeahead = (function () {
        function Typeahead(element, options) {
            this.$element = $(element);
            this.options = $.extend({}, Typeahead.defaults, options);
            this.theme = this.options.theme && this.options.themes && this.options.themes[this.options.theme] || Typeahead.defaults.themes[Typeahead.defaults.theme];
            this.$menu = $(this.options.menu || this.theme.menu);
            this.$appendTo = this.options.appendTo ? $(this.options.appendTo) : null;
            this.fitToElement = typeof this.options.fitToElement == 'boolean' ? this.options.fitToElement : false;
            this.shown = false;
            this.listen();
            this.showHintOnFocus = typeof this.options.showHintOnFocus == 'boolean' || this.options.showHintOnFocus === "all" ? this.options.showHintOnFocus : false;
            this.afterSelect = this.options.afterSelect;
            this.afterEmptySelect = this.options.afterEmptySelect;
            this.addItem = false;
            this.value = (this.$element.val() || this.$element.text());
            this.keyPressed = false;
            this.focused = this.$element.is(":focus");
        }
        Typeahead.prototype.setDefault = function (val) {
            this.$element.data('active', val);
            if (this.autoSelect || val) {
                var newVal = this.updater(val);
                if (!newVal) {
                    newVal = '';
                }
                this.$element
                    .val(this.displayText(newVal) || newVal)
                    .text(this.displayText(newVal) || newVal)
                    .change();
                this.afterSelect(newVal);
            }
            return this.hide();
        };
        Typeahead.prototype.select = function () {
            var val = this.$menu.find('.active').data('value');
            this.$element.data('active', val);
            if (this.autoSelect || val) {
                var newVal = this.updater(val);
                if (!newVal) {
                    newVal = '';
                }
                this.$element
                    .val(this.displayText(newVal) || newVal)
                    .text(this.displayText(newVal) || newVal)
                    .change();
                this.afterSelect(newVal);
                if (this.followLinkOnSelect && this.itemLink(val)) {
                    document.location.href = this.itemLink(val);
                    this.afterSelect(newVal);
                }
                else if (this.followLinkOnSelect && !this.itemLink(val)) {
                    this.afterEmptySelect(newVal);
                }
                else {
                    this.afterSelect(newVal);
                }
            }
            else {
                this.afterEmptySelect(newVal);
            }
            return this.hide();
        };
        Typeahead.prototype.updater = function (item) {
            return item;
        };
        Typeahead.prototype.setSource = function (source) {
            this.source = source;
        };
        Typeahead.prototype.show = function () {
            var pos = $.extend({}, this.$element.position(), {
                height: this.$element[0].offsetHeight
            });
            var scrollHeight = typeof this.options.scrollHeight == 'function' ?
                this.options.scrollHeight() :
                this.options.scrollHeight;
            var element;
            if (this.shown) {
                element = this.$menu;
            }
            else if (this.$appendTo) {
                element = this.$menu.appendTo(this.$appendTo);
                this.hasSameParent = this.$appendTo.is(this.$element.parent());
            }
            else {
                element = this.$menu.insertAfter(this.$element);
                this.hasSameParent = true;
            }
            if (!this.hasSameParent) {
                element.css("position", "fixed");
                var offset = this.$element.offset();
                pos.top = offset.top;
                pos.left = offset.left;
            }
            var dropup = $(element).parent().hasClass('dropup');
            var newTop = dropup ? 'auto' : (pos.top + pos.height + scrollHeight);
            var right = $(element).hasClass('dropdown-menu-right');
            var newLeft = right ? 'auto' : pos.left;
            element.css({ top: newTop, left: newLeft }).show();
            if (this.options.fitToElement === true) {
                element.css("width", this.$element.outerWidth() + "px");
            }
            this.shown = true;
            return this;
        };
        Typeahead.prototype.hide = function () {
            this.$menu.hide();
            this.shown = false;
            return this;
        };
        Typeahead.prototype.lookup = function (query) {
            var items;
            if (typeof (query) != 'undefined' && query !== null) {
                this.query = query;
            }
            else {
                this.query = this.$element.val();
            }
            if (this.query.length < this.options.minLength && !this.options.showHintOnFocus) {
                if (this.shown)
                    this.hide();
                return;
            }
            var worker = $.proxy(function () {
                var _this = this;
                if ($.isFunction(this.source) && this.source.length === 3) {
                    this.source(this.query, function () { return _this.process; }, function () { return _this.process; });
                }
                else if ($.isFunction(this.source)) {
                    this.source(this.query, function () { return _this.process; });
                }
                else if (this.source) {
                    this.process(this.source);
                }
            }, this);
            clearTimeout(this.lookupWorker);
            this.lookupWorker = setTimeout(worker, this.delay);
        };
        Typeahead.prototype.process = function (items) {
            var that = this;
            items = $.grep(items, function (item, _) {
                return that.matcher(item);
            });
            items = this.sorter(items);
            if (!items.length && !this.options.addItem) {
                return this.shown ? this.hide() : this;
            }
            if (items.length > 0) {
                this.$element.data('active', items[0]);
            }
            else {
                this.$element.data('active', null);
            }
            if (this.options.items != 'all') {
                items = items.slice(0, this.options.items);
            }
            if (this.options.addItem) {
                items.push(this.options.addItem);
            }
            return this.render(items).show();
        };
        Typeahead.prototype.matcher = function (item) {
            var it = this.displayText(item);
            return it.toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
        };
        Typeahead.prototype.sorter = function (items) {
            var beginswith = [];
            var caseSensitive = [];
            var caseInsensitive = [];
            var item;
            while ((item = items.shift())) {
                var it = this.displayText(item);
                if (!it.toLowerCase().indexOf(this.query.toLowerCase()))
                    beginswith.push(item);
                else if (~it.indexOf(this.query))
                    caseSensitive.push(item);
                else
                    caseInsensitive.push(item);
            }
            return beginswith.concat(caseSensitive, caseInsensitive);
        };
        Typeahead.prototype.highlighter = function (item) {
            var text = this.query;
            if (text === "") {
                return item;
            }
            var matches = item.match(/(>)([^<]*)(<)/g);
            var first = [];
            var second = [];
            var i;
            if (matches && matches.length) {
                for (i = 0; i < matches.length; ++i) {
                    if (matches[i].length > 2) {
                        first.push(matches[i]);
                    }
                }
            }
            else {
                first = [];
                first.push(item);
            }
            text = text.replace((/[\(\)\/\.\*\+\?\[\]]/g), function (mat) {
                return '\\' + mat;
            });
            var reg = new RegExp(text, "g");
            var m;
            for (i = 0; i < first.length; ++i) {
                m = first[i].match(reg);
                if (m && m.length > 0) {
                    second.push(first[i]);
                }
            }
            for (i = 0; i < second.length; ++i) {
                item = item.replace(second[i], second[i].replace(reg, '<strong>$&</strong>'));
            }
            return item;
        };
        Typeahead.prototype.render = function (items) {
            var that = this;
            var _category = that.options.separator;
            var activeFound = false;
            var itemsEl = $.map(items, function (_, item) {
                var text = that.displayText(item);
                var i = $(that.theme.item).data('value', item);
                i.find(that.theme.itemContentSelector)
                    .addBack(that.theme.itemContentSelector)
                    .html(that.highlighter(text));
                if (that.followLinkOnSelect) {
                    i.find('a').attr('href', that.itemLink(item));
                }
                i.find('a').attr('title', that.itemTitle(item));
                if (text == that.$element.val()) {
                    i.addClass('active');
                    that.$element.data('active', item);
                    activeFound = true;
                }
                return i[0];
            });
            this.$menu.replaceWith(itemsEl);
            return this;
        };
        Typeahead.prototype.displayText = function (item) {
            if (typeof item === "string")
                return item;
            else
                return item.name;
        };
        Typeahead.prototype.itemLink = function (item) {
            return null;
        };
        Typeahead.prototype.itemTitle = function (item) {
            return null;
        };
        Typeahead.prototype.next = function () {
            var active = this.$menu.find('.active').removeClass('active');
            var next = active.next();
            if (!next.length) {
                next = $(this.$menu.find($(this.theme.item).prop('tagName'))[0]);
            }
            next.addClass('active');
            var newVal = this.updater(next.data('value'));
            this.$element.val(this.displayText(newVal) || newVal);
        };
        Typeahead.prototype.prev = function () {
            var active = this.$menu.find('.active').removeClass('active');
            var prev = active.prev();
            if (!prev.length) {
                prev = this.$menu.find($(this.theme.item).prop('tagName')).last();
            }
            prev.addClass('active');
            var newVal = this.updater(prev.data('value'));
            this.$element.val(this.displayText(newVal) || newVal);
        };
        Typeahead.prototype.listen = function () {
            var _this = this;
            this.$element
                .on('focus.bootstrap3Typeahead', function () { return _this.focus; })
                .on('blur.bootstrap3Typeahead', function () { return _this.blur; })
                .on('keypress.bootstrap3Typeahead', function () { return _this.keypress; })
                .on('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead', function () { return _this.input; })
                .on('keyup.bootstrap3Typeahead', function () { return _this.keyup; });
            if (this.eventSupported('keydown')) {
                this.$element.on('keydown.bootstrap3Typeahead', function () { return _this.keydown; });
            }
            var itemTagName = $(this.theme.item).prop('tagName');
            if ('ontouchstart' in document.documentElement) {
                this.$menu
                    .on('touchstart', itemTagName, function () { return _this.touchstart; })
                    .on('touchend', itemTagName, function () { return _this.click; });
            }
            else {
                this.$menu
                    .on('click', function () { return _this.click; })
                    .on('mouseenter', itemTagName, function () { return _this.mouseenter; })
                    .on('mouseleave', itemTagName, function () { return _this.mouseleave; })
                    .on('mousedown', function () { return _this.mousedown; });
            }
        };
        Typeahead.prototype.destroy = function () {
            this.$element.data('typeahead', null);
            this.$element.data('active', null);
            this.$element
                .unbind('focus.bootstrap3Typeahead')
                .unbind('blur.bootstrap3Typeahead')
                .unbind('keypress.bootstrap3Typeahead')
                .unbind('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead')
                .unbind('keyup.bootstrap3Typeahead');
            if (this.eventSupported('keydown')) {
                this.$element.unbind('keydown.bootstrap3-typeahead');
            }
            this.$menu.remove();
            this.destroyed = true;
        };
        Typeahead.prototype.eventSupported = function (eventName) {
            return eventName in this.$element;
        };
        Typeahead.prototype.move = function (e) {
            if (!this.shown)
                return;
            switch (e.keyCode) {
                case 9:
                case 13:
                case 27:
                    e.preventDefault();
                    break;
                case 38:
                    if (e.shiftKey)
                        return;
                    e.preventDefault();
                    this.prev();
                    break;
                case 40:
                    if (e.shiftKey)
                        return;
                    e.preventDefault();
                    this.next();
                    break;
            }
        };
        Typeahead.prototype.keydown = function (e) {
            if (e.keyCode === 17) {
                return;
            }
            this.keyPressed = true;
            this.suppressKeyPressRepeat = $.inArray(e.keyCode, [40, 38, 9, 13, 27]) === -1;
            if (!this.shown && e.keyCode == 40) {
                this.lookup();
            }
            else {
                this.move(e);
            }
        };
        Typeahead.prototype.keypress = function (e) {
            if (this.suppressKeyPressRepeat)
                return;
            this.move(e);
        };
        Typeahead.prototype.input = function (e) {
            var currentValue = this.$element.val() || this.$element.text();
            if (this.value !== currentValue) {
                this.value = currentValue;
                this.lookup();
            }
        };
        Typeahead.prototype.keyup = function (e) {
            if (this.destroyed) {
                return;
            }
            switch (e.keyCode) {
                case 40:
                case 38:
                case 16:
                case 17:
                case 18:
                    break;
                case 9:
                    if (!this.shown || (this.showHintOnFocus && !this.keyPressed))
                        return;
                    this.select();
                    break;
                case 13:
                    if (!this.shown)
                        return;
                    this.select();
                    break;
                case 27:
                    if (!this.shown)
                        return;
                    this.hide();
                    break;
            }
        };
        Typeahead.prototype.focus = function (e) {
            if (!this.focused) {
                this.focused = true;
                this.keyPressed = false;
                if (this.options.showHintOnFocus && this.skipShowHintOnFocus !== true) {
                    if (this.options.showHintOnFocus === "all") {
                        this.lookup("");
                    }
                    else {
                        this.lookup();
                    }
                }
            }
            if (this.skipShowHintOnFocus) {
                this.skipShowHintOnFocus = false;
            }
        };
        Typeahead.prototype.blur = function (e) {
            if (!this.mousedover && !this.mouseddown && this.shown) {
                this.select();
                this.hide();
                this.focused = false;
                this.keyPressed = false;
            }
            else if (this.mouseddown) {
                this.skipShowHintOnFocus = true;
                this.$element.focus();
                this.mouseddown = false;
            }
        };
        Typeahead.prototype.click = function (e) {
            e.preventDefault();
            this.skipShowHintOnFocus = true;
            this.select();
            this.$element.focus();
            this.hide();
        };
        Typeahead.prototype.mouseenter = function (e) {
            this.mousedover = true;
            this.$menu.find('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        };
        Typeahead.prototype.mouseleave = function (e) {
            this.mousedover = false;
            if (!this.focused && this.shown)
                this.hide();
        };
        Typeahead.prototype.mousedown = function (e) {
            this.mouseddown = true;
            this.$menu.one("mouseup", function (e) {
                this.mouseddown = false;
            }.bind(this));
        };
        Typeahead.prototype.touchstart = function (e) {
            e.preventDefault();
            this.$menu.find('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        };
        Typeahead.prototype.touchend = function (e) {
            e.preventDefault();
            this.select();
            this.$element.focus();
        };
        Typeahead.defaults = {
            source: [],
            items: 8,
            minLength: 1,
            scrollHeight: 0,
            autoSelect: true,
            afterSelect: $.noop,
            afterEmptySelect: $.noop,
            addItem: false,
            followLinkOnSelect: false,
            delay: 0,
            separator: "category",
            theme: "bootstrap3",
            themes: {
                bootstrap3: {
                    menu: '<ul class="typeahead dropdown-menu" role="listbox"></ul>',
                    item: '<li><a class="dropdown-item" href="#" role="option"></a></li>',
                    itemContentSelector: "a",
                    headerHtml: '<li class="dropdown-header"></li>',
                    headerDivider: '<li class="divider" role="separator"></li>'
                },
                bootstrap4: {
                    menu: '<div class="typeahead dropdown-menu" role="listbox"></div>',
                    item: '<button class="dropdown-item" role="option"></button>',
                    itemContentSelector: '.dropdown-item',
                    headerHtml: '<h6 class="dropdown-header"></h6>',
                    headerDivider: '<div class="dropdown-divider"></div>'
                }
            }
        };
        return Typeahead;
    }());
    Bootstrap3Typeahead.Typeahead = Typeahead;
    $.fn.typeahead = function (option) {
        if (typeof option == 'string' && option == 'getActive') {
            return this.data('active');
        }
        var arg = arguments;
        return this.each(function () {
            var $this = $(this);
            var options = typeof option == 'object' && option;
            var data = $this.data('typeahead');
            if (!data) {
                $this.data('typeahead', (data = new Typeahead(this, options)));
            }
            if (typeof option == 'string' && data[option]) {
                if (arg.length > 1) {
                    data[option].apply(data, Array.prototype.slice.call(arg, 1));
                }
                else {
                    data[option]();
                }
            }
        });
    };
    $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
        var $this = $(this);
        if ($this.data('typeahead'))
            return;
        $this.typeahead($this.data());
    });
})(Bootstrap3Typeahead || (Bootstrap3Typeahead = {}));
