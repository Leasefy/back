import { PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto.js';

/**
 * DTO for updating a property listing.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
