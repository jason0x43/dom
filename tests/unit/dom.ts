import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as dom from 'src/dom';

let element: HTMLElement;

registerSuite({
	name: 'dom',

	byId: {
		setup() {
			element = document.createElement('span');
			element.id = 'id';
		},

		teardown() {
			element.parentElement.removeChild(element);
		},

		'result found'() {
			document.body.appendChild(element);
			assert.strictEqual(dom.byId('id').id, 'id');
		},

		'result not found'() {
			assert.isNull(dom.byId('undefined'));
		}
	},

	contains: (function () {
		function testContains(ancestor: Element, child: Node) {
			ancestor.appendChild(child);
			document.body.appendChild(ancestor);

			assert.isTrue(dom.contains(ancestor, child),
				'should return true when 2nd argument is a child of 1st argument');
			assert.isTrue(dom.contains(document.body, child),
				'should return true when 2nd argument is a grandchild of 1st argument');
			assert.isFalse(dom.contains(<any> child, ancestor),
				'should return false when 2nd argument is an ancestor of 1st argument');
		}

		return {
			beforeEach() {
				element = document.createElement('div');
			},

			afterEach() {
				document.body.removeChild(element);
			},

			'basic tests'() {
				testContains(element, document.createElement('div'));
			},

			'tests with text node'() {
				testContains(element, document.createTextNode(' '));
			}
		};
	})(),

	fromString: (function () {
		function createTagTest(tagName: string) {
			return function () {
				// Single
				let html = '<' + tagName + '></' + tagName + '>';
				let fragment = dom.fromString(html);
				assert.strictEqual(fragment.firstChild.nodeName, tagName.toUpperCase());

				// Multiple
				html += html;
				fragment = dom.fromString(html);
				assert.strictEqual(fragment.childNodes.length, 2);
				assert.strictEqual(fragment.firstChild.nodeName, tagName.toUpperCase());
				assert.strictEqual(fragment.lastChild.nodeName, tagName.toUpperCase());
			};
		}

		return {
			'returns document fragment for single node'() {
				let result = dom.fromString('<div></div>');
				assert.strictEqual(result.firstChild.nodeName, 'DIV');
				assert.strictEqual(result.nodeName, '#document-fragment');
			},

			'returns correct fragment for tree'() {
				let parent = document.createElement('div');
				let child = document.createElement('span');

				parent.appendChild(child);
				let fragment = dom.fromString(parent.outerHTML);

				assert.strictEqual((<HTMLElement> fragment.firstChild).outerHTML, parent.outerHTML);
			},

			'returns correct fragment for forest'() {
				let parent = document.createElement('div');
				let children = [
					document.createElement('span'),
					document.createElement('div')
				];

				for (let child of children) {
					parent.appendChild(child);
				}

				let fragment = dom.fromString(parent.innerHTML);
				for (let i in children) {
					assert.strictEqual(fragment.childNodes[i].nodeName,
						parent.childNodes[i].nodeName);
				}
			},

			'<option> is created successfully and returned unwrapped': createTagTest('option'),
			'<tbody> is created successfully and returned unwrapped': createTagTest('tbody'),
			'<thead> is created successfully and returned unwrapped': createTagTest('thead'),
			'<tfoot> is created successfully and returned unwrapped': createTagTest('tfoot'),
			'<th> is created successfully and returned unwrapped': createTagTest('th'),
			'<td> is created successfully and returned unwrapped': createTagTest('td'),
			'<legend> is created successfully and returned unwrapped': createTagTest('legend'),
			'<caption> is created successfully and returned unwrapped': createTagTest('caption'),
			'<colgroup> is created successfully and returned unwrapped': createTagTest('colgroup'),
			'<col> is created successfully and returned unwrapped': createTagTest('col'),
			'<li> is created successfully and returned unwrapped': createTagTest('li')
		};
	})(),

	place: (function () {
		function createBeforeOrAfterTest(position: dom.Position) {
			const siblingProperty = position === dom.Position.Before ? 'previousSibling' : 'nextSibling';

			return function () {
				let node = document.createElement('div');
				let parent = document.createElement('div');
				let relativeElement = document.createElement('div');
				parent.appendChild(relativeElement);

				dom.place(node, position, relativeElement);
				// TS7017
				assert.strictEqual((<any> relativeElement)[siblingProperty], node);
			};
		}

		function createFirstOrLastTest(position: dom.Position) {
			const childProperty = position === dom.Position.FirstIn ? 'firstChild' : 'lastChild';
			const name = 'dom.Position.' + (position === dom.Position.FirstIn ? 'FirstIn' : 'LastIn');

			return function () {
				let node = document.createElement('div');
				let relativeElement = document.createElement('div');

				dom.place(node, position, relativeElement);
				// TS7017
				assert.strictEqual((<any> relativeElement)[childProperty], node,
					name + ' should insert node as child even if relativeElement has no children');
				assert.strictEqual(relativeElement.children.length, 1,
					'The placed node should be the only child');

				node = document.createElement('div');
				dom.place(node, position, relativeElement);
				// TS7017
				assert.strictEqual((<any> relativeElement)[childProperty], node,
					name + ' should insert node at correct end if relativeElement has children');
				assert.strictEqual(relativeElement.children.length, 2,
					'relativeElement should have one more child after placement');
			};
		}

		return {
			'should throw if relativeElement has no parent, for sibling placement options only'() {
				let node = document.createElement('div');
				let reference = document.createElement('div');

				// TS4091
				for (var position of [ dom.Position.After, dom.Position.Before, dom.Position.Replace ]) {
					assert.throws(function () {
						dom.place(node, position, reference);
					}, ReferenceError);
				}
				for (var position of [ dom.Position.FirstIn, dom.Position.LastIn ]) {
					assert.doesNotThrow(function () {
						dom.place(node, position, reference);
					});
				}
			},

			'when position argument is Position.Before, the node is placed before relativeElement':
				createBeforeOrAfterTest(dom.Position.Before),

			'when position argument is Position.After, the node is placed after relativeElement':
				createBeforeOrAfterTest(dom.Position.After),

			'when position argument is Position.Replace, the node replaces relativeElement'() {
				let container = document.createElement('div');
				let node = document.createElement('div');
				let reference = document.createElement('div');

				container.appendChild(reference);
				dom.place(node, dom.Position.Replace, reference);
				assert.strictEqual(container.firstChild, node);
			},

			'when position argument is Position.FirstIn, the node is placed as first child of relativeElement':
				createFirstOrLastTest(dom.Position.FirstIn),

			'when position argument is Position.LastIn, the node is placed as last child of relativeElement':
				createFirstOrLastTest(dom.Position.LastIn)
		};
	})(),

	remove: {
		'should not throw if node has no parent'() {
			let node = document.createElement('div');
			assert.doesNotThrow(function () {
				dom.remove(node);
			});
		},

		'should remove element from its parent'() {
			let parent = document.createElement('div');
			let node = document.createElement('div');

			parent.appendChild(node);
			assert.strictEqual(parent.children.length, 1);
			assert.strictEqual(node.parentNode, parent);

			dom.remove(node);
			assert.strictEqual(parent.children.length, 0);
			assert.isNull(node.parentNode);
		}
	}
});
