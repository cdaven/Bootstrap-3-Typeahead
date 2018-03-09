/* =============================================================
 * bootstrap3-typeahead.js v4.0.2
 * https://github.com/bassjobsen/Bootstrap-3-Typeahead
 * =============================================================
 * Original written by @mdo and @fat
 * =============================================================
 * Copyright 2014 Bass Jobsen @bassjobsen
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


interface JQuery {
    typeahead: (option: any) => void;
}

module Bootstrap3Typeahead {

    type arrstrcallback = () => string[];
    type numcallback = () => number;

    interface IOptions {
        source?: string[] | arrstrcallback;
        items?: number | "all";
        minLength?: number;
        scrollHeight?: number | numcallback;
        matcher?: any;
        sorter?: any;
        select?: any;
        autoSelect?: boolean;
        highlighter?: any;
        render?: any;
        updater?: any;
        displayText?: any;
        itemLink?: string;
        itemTitle?: string;
        followLinkOnSelect?: any;
        delay?: number;
        theme?: string;
        themes?: any;
        menu?: any;
        appendTo?: HTMLElement;
        fitToElement?: boolean;
        showHintOnFocus?: boolean | "all";
        afterSelect?: any;
        afterEmptySelect?: any;
        addItem?: any;
        separator?: string;
    }

    interface ITheme {
        menu: string;
        item: string;
        itemContentSelector: string;
        headerHtml: string;
        headerDivider: string;
    }

    interface IItem {
        name: string;
        __type: "category" | "divider";
    }

    export class Typeahead {
        options: IOptions;
        $element: JQuery;
        $menu: JQuery;
        $appendTo: JQuery;
        autoSelect: boolean;
        followLinkOnSelect: any;
        source: any;
        delay: number;
        theme: ITheme;
        fitToElement: boolean;
        shown: boolean;
        showHintOnFocus: boolean | "all";
        afterSelect: any;
        afterEmptySelect: any;
        addItem: any;
        value: string;

        private query: string;
        private keyPressed: boolean;
        private focused: boolean;
        private destroyed: boolean;
        private mousedover: boolean;
        private mouseddown: boolean;
        private hasSameParent: boolean;
        private suppressKeyPressRepeat: boolean;
        private skipShowHintOnFocus: boolean;
        private lookupWorker: number;

        static defaults: IOptions = {
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
        }

        constructor(element: HTMLElement, options: IOptions) {
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
            this.value = (this.$element.val() || this.$element.text()) as string;
            this.keyPressed = false;
            this.focused = this.$element.is(":focus");
        }

        setDefault(val: string) {
            // var val = this.$menu.find('.active').data('value');
            this.$element.data('active', val);
            if (this.autoSelect || val) {
                let newVal = this.updater(val);
                // Updater can be set to any random functions via "options" parameter in constructor above.
                // Add null check for cases when updater returns void or undefined.
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
        }

        select() {
            var val = this.$menu.find('.active').data('value');

            this.$element.data('active', val);
            if (this.autoSelect || val) {
                var newVal = this.updater(val);
                // Updater can be set to any random functions via "options" parameter in constructor above.
                // Add null check for cases when updater returns void or undefined.
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
                } else if (this.followLinkOnSelect && !this.itemLink(val)) {
                    this.afterEmptySelect(newVal);
                } else {
                    this.afterSelect(newVal);
                }
            } else {
                this.afterEmptySelect(newVal);
            }

            return this.hide();
        }

        updater(item: string): string {
            return item;
        }

        setSource(source: any) {
            this.source = source;
        }

        show() {
            var pos = $.extend({}, this.$element.position(), {
                height: this.$element[0].offsetHeight
            });

            var scrollHeight = typeof this.options.scrollHeight == 'function' ?
                this.options.scrollHeight() :
                this.options.scrollHeight;

            var element;
            if (this.shown) {
                element = this.$menu;
            } else if (this.$appendTo) {
                element = this.$menu.appendTo(this.$appendTo);
                this.hasSameParent = this.$appendTo.is(this.$element.parent());
            } else {
                element = this.$menu.insertAfter(this.$element);
                this.hasSameParent = true;
            }

            if (!this.hasSameParent) {
                // We cannot rely on the element position, need to position relative to the window
                element.css("position", "fixed");
                var offset = this.$element.offset();
                pos.top = offset.top;
                pos.left = offset.left;
            }
            // The rules for bootstrap are: 'dropup' in the parent and 'dropdown-menu-right' in the element.
            // Note that to get right alignment, you'll need to specify `menu` in the options to be:
            // '<ul class="typeahead dropdown-menu" role="listbox"></ul>'
            var dropup = $(element).parent().hasClass('dropup');
            var newTop = dropup ? 'auto' : (pos.top + pos.height + scrollHeight);
            var right = $(element).hasClass('dropdown-menu-right');
            var newLeft = right ? 'auto' : pos.left;
            // it seems like setting the css is a bad idea (just let Bootstrap do it), but I'll keep the old
            // logic in place except for the dropup/right-align cases.
            element.css({ top: newTop, left: newLeft }).show();

            if (this.options.fitToElement === true) {
                element.css("width", this.$element.outerWidth() + "px");
            }

            this.shown = true;
            return this;
        }

        hide() {
            this.$menu.hide();
            this.shown = false;
            return this;
        }

        lookup(query?: string): void {
            var items;
            if (typeof (query) != 'undefined' && query !== null) {
                this.query = query;
            } else {
                this.query = this.$element.val() as string;
            }

            if (this.query.length < this.options.minLength && !this.options.showHintOnFocus) {
                if (this.shown)
                    this.hide();
                return;
            }

            const worker = $.proxy(function() {
                // Bloodhound (since 0.11) needs three arguments.
                // Two of them are callback functions (sync and async) for local and remote data processing
                // see https://github.com/twitter/typeahead.js/blob/master/src/bloodhound/bloodhound.js#L132
                if ($.isFunction(this.source) && this.source.length === 3) {
                    this.source(this.query, () => this.process, () => this.process);
                } else if ($.isFunction(this.source)) {
                    this.source(this.query, () => this.process);
                } else if (this.source) {
                    this.process(this.source);
                }
            }, this);

            clearTimeout(this.lookupWorker);
            this.lookupWorker = setTimeout(worker, this.delay);
        }

        process(items: (string | IItem)[]) {
            const that = this;

            items = $.grep(items, (item: string | IItem, _: number) => {
                return that.matcher(item);
            });

            items = this.sorter(items);

            if (!items.length && !this.options.addItem) {
                return this.shown ? this.hide() : this;
            }

            if (items.length > 0) {
                this.$element.data('active', items[0]);
            } else {
                this.$element.data('active', null);
            }

            if (this.options.items != 'all') {
                items = items.slice(0, this.options.items);
            }

            // Add item
            if (this.options.addItem) {
                items.push(this.options.addItem);
            }

            return this.render(items).show();
        }

        matcher(item: string | IItem): boolean {
            var it = this.displayText(item);
            return it.toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
        }

        sorter(items: (string | IItem)[]) {
            var beginswith = [];
            var caseSensitive = [];
            var caseInsensitive = [];
            var item;

            while ((item = items.shift())) {
                var it = this.displayText(item);
                if (!it.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item);
                else if (~it.indexOf(this.query)) caseSensitive.push(item);
                else caseInsensitive.push(item);
            }

            return beginswith.concat(caseSensitive, caseInsensitive);
        }

        highlighter(item: string): string {
            var text = this.query;
            if (text === "") {
                return item;
            }
            var matches = item.match(/(>)([^<]*)(<)/g);
            var first = [];
            var second = [];
            var i;
            if (matches && matches.length) {
                //html
                for (i = 0; i < matches.length; ++i) {
                    if (matches[i].length > 2) {//escape '><'
                        first.push(matches[i]);
                    }
                }
            } else {
                //text
                first = [];
                first.push(item);
            }
            text = text.replace((/[\(\)\/\.\*\+\?\[\]]/g), function(mat) {
                return '\\' + mat;
            });
            var reg = new RegExp(text, "g");
            var m;
            for (i = 0; i < first.length; ++i) {
                m = first[i].match(reg);
                if (m && m.length > 0) {//find all text nodes matches
                    second.push(first[i]);
                }
            }
            for (i = 0; i < second.length; ++i) {
                item = item.replace(second[i], second[i].replace(reg, '<strong>$&</strong>'));
            }
            return item;
        }

        render(items: (string | IItem)[]): Typeahead {
            const that = this;
            const _category = that.options.separator;
            let activeFound = false;

            /*
            $.each(items, function(key: number, value: string | IItem) {
                // inject separator
                if (key > 0 && value[_category] !== items[key - 1][_category]) {
                    data.push({
                        __type: 'divider'
                    });
                }

                // inject category header
                if (value[_category] && (key === 0 || value[_category] !== items[key - 1][_category])) {
                    data.push({
                        __type: 'category',
                        name: value[_category]
                    });
                }
                data.push(value);
            });
            */

            let itemsEl = $.map(items, (_: number, item: string | IItem) => {
                /*
                if ((item.__type || false) == 'category') {
                    return $(that.theme.headerHtml).text(item.name)[0];
                }

                if ((item.__type || false) == 'divider') {
                    return $(that.theme.headerDivider)[0];
                }
                */

                let text = that.displayText(item);
                let i = $(that.theme.item).data('value', item);
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

            /*
            if (this.autoSelect && !activeFound) {
                itemsEl.filter(':not(.dropdown-header)').first().addClass('active');
                this.$element.data('active', itemsEl.first().data('value'));
            }
            */

            this.$menu.replaceWith(itemsEl);
            return this;
        }

        displayText(item: string | IItem): string {
            if (typeof item === "string")
                return item;
            else
                return item.name;
        }

        itemLink(item: string | IItem): string {
            return null;
        }

        itemTitle(item: string | IItem): string {
            return null;
        }

        next() {
            var active = this.$menu.find('.active').removeClass('active');
            var next = active.next();

            if (!next.length) {
                next = $(this.$menu.find($(this.theme.item).prop('tagName'))[0]);
            }

            next.addClass('active');
            // added for screen reader
            var newVal = this.updater(next.data('value'));
            this.$element.val(this.displayText(newVal) || newVal);
        }

        prev() {
            var active = this.$menu.find('.active').removeClass('active');
            var prev = active.prev();

            if (!prev.length) {
                prev = this.$menu.find($(this.theme.item).prop('tagName')).last();
            }

            prev.addClass('active');
            // added for screen reader
            var newVal = this.updater(prev.data('value'));
            this.$element.val(this.displayText(newVal) || newVal);
        }

        listen() {
            this.$element
                .on('focus.bootstrap3Typeahead', () => this.focus)
                .on('blur.bootstrap3Typeahead', () => this.blur)
                .on('keypress.bootstrap3Typeahead', () => this.keypress)
                .on('propertychange.bootstrap3Typeahead input.bootstrap3Typeahead', () => this.input)
                .on('keyup.bootstrap3Typeahead', () => this.keyup);

            if (this.eventSupported('keydown')) {
                this.$element.on('keydown.bootstrap3Typeahead', () => this.keydown);
            }

            var itemTagName = $(this.theme.item).prop('tagName');
            if ('ontouchstart' in document.documentElement) {
                this.$menu
                    .on('touchstart', itemTagName, () => this.touchstart)
                    .on('touchend', itemTagName, () => this.click);
            } else {
                this.$menu
                    .on('click', () => this.click)
                    .on('mouseenter', itemTagName, () => this.mouseenter)
                    .on('mouseleave', itemTagName, () => this.mouseleave)
                    .on('mousedown', () => this.mousedown);
            }
        }

        destroy() {
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
        }

        eventSupported(eventName: string): boolean {
            return eventName in this.$element;
        }

        move(e: JQueryKeyEventObject) {
            if (!this.shown)
                return;

            switch (e.keyCode) {
                case 9: // tab
                case 13: // enter
                case 27: // escape
                    e.preventDefault();
                    break;

                case 38: // up arrow
                    // with the shiftKey (this is actually the left parenthesis)
                    if (e.shiftKey) return;
                    e.preventDefault();
                    this.prev();
                    break;

                case 40: // down arrow
                    // with the shiftKey (this is actually the right parenthesis)
                    if (e.shiftKey) return;
                    e.preventDefault();
                    this.next();
                    break;
            }
        }

        keydown(e: JQueryKeyEventObject) {
            /**
             * Prevent to make an ajax call while copying and pasting.
             *
             * @author Simone Sacchi
             * @version 2018/01/18
             */
            if (e.keyCode === 17) { // ctrl
                return;
            }
            this.keyPressed = true;
            this.suppressKeyPressRepeat = $.inArray(e.keyCode, [40, 38, 9, 13, 27]) === -1;
            if (!this.shown && e.keyCode == 40) {
                this.lookup();
            } else {
                this.move(e);
            }
        }

        keypress(e: JQueryKeyEventObject) {
            if (this.suppressKeyPressRepeat) return;
            this.move(e);
        }

        input(e: JQueryInputEventObject) {
            // This is a fixed for IE10/11 that fires the input event when a placehoder is changed
            // (https://connect.microsoft.com/IE/feedback/details/810538/ie-11-fires-input-event-on-focus)
            var currentValue = this.$element.val() || this.$element.text();
            if (this.value !== currentValue) {
                this.value = currentValue as string;
                this.lookup();
            }
        }

        keyup(e: JQueryKeyEventObject) {
            if (this.destroyed) {
                return;
            }
            switch (e.keyCode) {
                case 40: // down arrow
                case 38: // up arrow
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                    break;

                case 9: // tab
                    if (!this.shown || (this.showHintOnFocus && !this.keyPressed)) return;
                    this.select();
                    break;
                case 13: // enter
                    if (!this.shown) return;
                    this.select();
                    break;

                case 27: // escape
                    if (!this.shown) return;
                    this.hide();
                    break;
            }

        }

        focus(e: JQueryEventObject) {
            if (!this.focused) {
                this.focused = true;
                this.keyPressed = false;
                if (this.options.showHintOnFocus && this.skipShowHintOnFocus !== true) {
                    if (this.options.showHintOnFocus === "all") {
                        this.lookup("");
                    } else {
                        this.lookup();
                    }
                }
            }
            if (this.skipShowHintOnFocus) {
                this.skipShowHintOnFocus = false;
            }
        }

        blur(e: JQueryMouseEventObject) {
            if (!this.mousedover && !this.mouseddown && this.shown) {
                this.select();
                this.hide();
                this.focused = false;
                this.keyPressed = false;
            } else if (this.mouseddown) {
                // This is for IE that blurs the input when user clicks on scroll.
                // We set the focus back on the input and prevent the lookup to occur again
                this.skipShowHintOnFocus = true;
                this.$element.focus();
                this.mouseddown = false;
            }
        }

        click(e: JQueryMouseEventObject) {
            e.preventDefault();
            this.skipShowHintOnFocus = true;
            this.select();
            this.$element.focus();
            this.hide();
        }

        mouseenter(e: JQueryMouseEventObject) {
            this.mousedover = true;
            this.$menu.find('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        }

        mouseleave(e: JQueryMouseEventObject) {
            this.mousedover = false;
            if (!this.focused && this.shown) this.hide();
        }

        /**
          * We track the mousedown for IE. When clicking on the menu scrollbar, IE makes the input blur thus hiding the menu.
          */
        mousedown(e: JQueryMouseEventObject) {
            this.mouseddown = true;
            this.$menu.one("mouseup", function(e: JQueryMouseEventObject) {
                // IE won't fire this, but FF and Chrome will so we reset our flag for them here
                this.mouseddown = false;
            }.bind(this));
        }

        touchstart(e: JQueryEventObject) {
            e.preventDefault();
            this.$menu.find('.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        }

        touchend(e: JQueryEventObject) {
            e.preventDefault();
            this.select();
            this.$element.focus();
        }
    }


    /* TYPEAHEAD PLUGIN DEFINITION
     * =========================== */

    $.fn.typeahead = function(option: any) {
        if (typeof option == 'string' && option == 'getActive') {
            return this.data('active');
        }

        const arg = arguments;
        return this.each(function() {
            const $this = $(this);
            const options = typeof option == 'object' && option;
            let data = $this.data('typeahead');

            if (!data) {
                $this.data('typeahead', (data = new Typeahead(this, options)));
            }

            if (typeof option == 'string' && data[option]) {
                if (arg.length > 1) {
                    data[option].apply(data, Array.prototype.slice.call(arg, 1));
                } else {
                    data[option]();
                }
            }
        });
    };


    /* TYPEAHEAD DATA-API
     * ================== */

    $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function(e) {
        var $this = $(this);
        if ($this.data('typeahead')) return;
        $this.typeahead($this.data());
    });

}
