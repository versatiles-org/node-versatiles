
import { default as HttpReader } from './nodejs/reader_http.js';
import { default as FileReader } from './nodejs/reader_file.js';
import getHeader from './container/get_header.js';

export class Versatiles {
	opt = {
		tms: false
	}
	constructor(src, opt) {
		Object.assign(this.opt, opt)

		if (src.startsWith('https://')) {
			this.reader = new HttpReader(src);
		} else if (src.startsWith('http://')) {
			this.reader = new HttpReader(src);
		} else {
			this.reader = new FileReader(src);
		}

		Object.assign(this, {
			getHeader,
		})
	}
}
