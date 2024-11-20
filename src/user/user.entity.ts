import {BeforeInsert, Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import * as bcrypt from 'bcrypt';
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    email: string;

    @Column({nullable: true})
    firstName: string | null;

    @Column({nullable: true})
    lastName: string | null;

    @Column({nullable: true})
    phone?: number | null;

    @Column({nullable: true})
    bio?: string | null;

    @Column({nullable: true})
    address?: string | null;

    @Column({nullable: true})
    region?: string | null;

    @Column({nullable: true})
    company?: string | null;

    @Column()
    role: number | null;

    @Column({nullable: true})
    profession?: string | null;

    @Column()
    password: string;

    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 12);
    }
}