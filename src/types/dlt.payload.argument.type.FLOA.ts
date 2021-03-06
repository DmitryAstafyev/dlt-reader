import * as PayloadConsts from '../dlt.payload.arguments.consts';
import TypeInfo from '../dlt.payload.argument.type.info';
import { APayloadTypeProcessor } from '../interfaces/interface.dlt.payload.argument.type.processor';
import { DLTError, EErrorCode } from '../dlt.error';

export interface IData {
    value: number | undefined;
    name: string | undefined;
    unit: string | undefined;
}

interface IPointData {
    quantization: number | undefined;
    offset: number | undefined;
    bufferOffset: number;
}

export default class FLOA extends APayloadTypeProcessor<IData> {

    private _value: number | undefined;
    private _name: string | undefined;
    private _unit: string | undefined;

    constructor(buffer: Buffer, info: TypeInfo, MSBF: boolean) {
        super(buffer, info, MSBF);
    }

    public read(): IData | DLTError {
        const names: { name: string | undefined, unit: string | undefined } = this._getName();
        this._name = names.name;
        this._unit = names.unit;
        switch (this._info.TYLEValue) {
            case 1:
                // TODO: what is here? page: 87
                break;
            case 2:
                this._value = this._toFloat16(this.readInt(2));
                break;
            case 3:
                this._value = this.readFloat();
                break;
            case 4:
                this._value = this.readDouble();
                break;
            case 5:
                // TODO: add support float 128
                this._value = 0;
                this._offset += 16;
                break;
        }
        return { name: this._name, unit: this._unit, value: this._value };
    }

    public toString(): string {
        if (this._name === undefined && this._unit === undefined) {
            return `${this._value}`;
        } else if (this._name === undefined) {
            return `${this._unit}=${this._value}`;
        } else {
            return `${this._name}: ${this._unit}=${this._value}`;
        }
    }

    public crop(): Buffer {
        return this._buffer.slice(this._offset, this._buffer.length);
    }

    private _getName(): { name: string | undefined, unit: string | undefined } {
        const name = { length: 0, value: '' };
        const unit = { length: 0, value: '' };
        if (!this._info.VARI) {
            return { name: undefined, unit: undefined };
        }
        name.length = this.readUInt16();
        unit.length = this.readUInt16();
        name.value = this._buffer.slice(this._offset, this._offset + name.length).toString('ascii');
        this._offset += name.length;
        unit.value = this._buffer.slice(this._offset, this._offset + unit.length).toString('ascii');
        this._offset += unit.length;
        return {
            name: name.value,
            unit: unit.value,
        };
    }

    private _toFloat16(binary: number): number {
        // https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript
        const s = (binary & 0x8000) >> 15;
        const e = (binary & 0x7C00) >> 10;
        const f = binary & 0x03FF;

        if (e === 0) {
            return (s ? -1 : 1) * Math.pow(2, -14) * (f / Math.pow(2, 10));
        } else if (e === 0x1F) {
            return f ? NaN : ((s ? -1 : 1) * Infinity);
        }
        return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + (f / Math.pow(2, 10)));
    }

}
