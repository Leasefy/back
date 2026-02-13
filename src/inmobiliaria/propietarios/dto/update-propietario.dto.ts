import { PartialType } from '@nestjs/swagger';
import { CreatePropietarioDto } from './create-propietario.dto.js';

export class UpdatePropietarioDto extends PartialType(CreatePropietarioDto) {}
