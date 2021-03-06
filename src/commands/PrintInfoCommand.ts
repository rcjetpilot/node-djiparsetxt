import { ICommand } from "./ICommand";
import { ServiceManager, ServiceTypes } from "../common/ServiceManager";
import { FilesService } from "../services/FilesService";
import { FileParsingService } from '../services/FileParsingService';
import { FileInfoService } from '../services/FileInfoService';
import { RecordTypes } from "../services/RecordTypes";

export class PrintInfoCommand implements ICommand {

	public exec(service_man: ServiceManager): void 
	{
		const files_service = service_man.get_service(ServiceTypes.Files) as FilesService;
		const file_info_service = service_man.get_service(ServiceTypes.FileInfo) as 
			FileInfoService;
		const file_parsing_service = service_man.get_service(ServiceTypes.FileParsing) as FileParsingService;

		if (files_service) {
			files_service.files(file => {
				// show header details
				console.log(`file "${file.path}"`);
				if (service_man.argv.print_header) {
					const header_info = file_info_service.get_header_info(file.buffer);
					console.log('  Header Info:');
					console.log(`    file size = ${header_info.file_size} B`);
					console.log(`    records area size = ${header_info.records_size} B`);
					console.log(`    details area size = ${header_info.details_size} B`);
					console.log("    version:", header_info.version.readUInt8(2));
				}
				
				let records = null;
				if (service_man.argv.print_records) {
					console.log('  Records Info:');
					records = file_parsing_service.parse_records(file.buffer);
					const stats = records.stats;
					console.log(`    records area size = ${stats.records_area_size} B`);
					console.log(`    record count = ${stats.record_count} Records`);
					console.log(`    invalid records = ${stats.invalid_records}`);
					console.log(`    Records in File:`);
					this.print_type_count_table(stats.type_count, '      ');
				}

				if (service_man.argv.details) {
					console.log('  Details:');
					const details = file_info_service.get_details(file.buffer);
					for (const key in details) {
						console.log(`    ${key} = ${details[key]}`);
					}
				}

				if (service_man.argv.distrib) {
					if (records == null) {
						records = file_parsing_service.parse_records(file.buffer);
					}
					console.log('  Record Distribution:');
					console.log(records.records.map((val) => val.type));
				}
			});
		}
	}
	
	private print_type_count_table(type_count: { [type: number]: number; }, indent: string): void 
	{
		const max_width = Object.keys(type_count).reduce((acc, val) => {
			const name = RecordTypes[parseInt(val)];
			if (name == undefined) return acc;
			return Math.max(acc, name.length);
		}, 0);

		// hacky way of aligning
		for (const key in type_count) {
			let hex_rep = parseInt(key).toString(16);
			if (hex_rep.length == 1) hex_rep = '0' + hex_rep;
			let part = `(${RecordTypes[key]})`;
			if (max_width - (part.length - 2) != 0) {
				part += ' '.repeat(max_width - part.length + 2);
			}
			console.log(`${indent}0x${hex_rep}`, part, `= ${type_count[key]}`);
		}
	}
}
