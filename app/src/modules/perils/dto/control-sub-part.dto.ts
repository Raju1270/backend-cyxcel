import { IsNotEmpty, IsString } from 'class-validator';

// SHAPE STORED IN Control.subParts (Json) FOR A SECTION_WITH_SUBPARTS QUESTION.
// MUST BE A REAL CLASS (NOT JUST A TS interface) WITH @Type(() => ControlSubPartDto)
// ON controlSubParts IN create-peril.dto.ts/update-peril.dto.ts - WITHOUT THAT,
// THE GLOBAL ValidationPipe's transformOptions.enableImplicitConversion HAS NO
// TYPE INFO FOR EACH ARRAY ELEMENT AND MANGLES EVERY PLAIN {key,text} OBJECT
// INTO [] (class-transformer'S IMPLICIT CONVERSION EFFECTIVELY RUNS Array.from()
// ON EACH ITEM, WHICH RETURNS [] FOR A NON-ITERABLE, NON-ARRAY-LIKE OBJECT).
// EVERY SUB-PART IS ANSWERED Yes/No/N-A ON THE USER PANEL - NO PER-SUB-PART
// ANSWER-TYPE FIELD NEEDED.
export class ControlSubPartDto {
  // STABLE IDENTIFIER FOR THIS SUB-PART (E.G. "a", "b", "c") - USED TO KEY ITS
  // ANSWER SEPARATELY FROM ITS SIBLINGS WHEN THE USER PANEL EVENTUALLY STORES
  // PER-SUB-PART ANSWERS, SO REORDERING SUB-PARTS LATER DOESN'T SHIFT WHICH
  // ANSWER BELONGS TO WHICH ONE.
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
