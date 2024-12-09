import {IsInt, IsPositive} from "class-validator";

export class GetUserInfoDto {
    @IsInt()
    @IsPositive()
    userId: number;
}